/**
 * Prompt Injection & Jailbreak Heuristic Detector
 * Identifies adversarial prompts, delimiter overrides, instruction evasions, and encoded payloads.
 */

export interface InjectionAnalysisResult {
  is_injection: boolean;
  is_jailbreak: boolean;
  is_data_exfiltration_attempt: boolean;
  risk_score: number;
  tactics: string[];
  explanation: string;
}

export class InjectionDetector {
  private static INJECTION_PATTERNS = [
    {
      regex: /(?:ignore|disregard|forget|bypass|override)\s+(?:all\s+)?(?:previous|prior|above|former)\s+(?:instructions|prompts|rules|guidelines)/i,
      tactic: "instruction_override",
      weight: 45,
      description: "Direct instruction override attempt ('ignore previous instructions')"
    },
    {
      regex: /(?:reveal|show|display|print|output|leak|repeat)\s+(?:your\s+)?(?:system\s+prompt|developer\s+mode|internal\s+instructions|initial\s+prompt)/i,
      tactic: "system_prompt_leakage",
      weight: 50,
      description: "Attempt to extract confidential system instructions or internal prompt"
    },
    {
      regex: /\b(?:DAN|Do\s+Anything\s+Now|AIM|Developer\s+Mode\s+v\d+|STAN|JailbreakMode|UnhingedMode)\b/i,
      tactic: "known_jailbreak_persona",
      weight: 60,
      description: "Known adversary persona jailbreak attempt (DAN/Developer Mode)"
    },
    {
      regex: /(?:pretend|simulate|act\s+as)\s+(?:an?\s+)?(?:unfiltered|unrestricted|unethical|jailbroken|evil|opposite)\s+(?:ai|assistant|model|bot)/i,
      tactic: "roleplay_subversion",
      weight: 40,
      description: "Subversive roleplay intended to bypass ethical and security guardrails"
    },
    {
      regex: /<\/?untrusted_content>|<\|im_start\|>|<\|im_end\|>|\[\/?INST\]|```(?:system|admin|developer)/i,
      tactic: "delimiter_injection",
      weight: 55,
      description: "Delimiter injection attempt targeting LLM conversation scaffolding"
    },
    {
      regex: /(?:send|exfiltrate|transmit|post)\s+(?:this|keys?|secrets?|data)\s+(?:to|via)\s+(?:https?:\/\/|[a-z0-9]+\.(?:com|org|net|xyz|ru|cn))/i,
      tactic: "data_exfiltration",
      weight: 45,
      description: "Data exfiltration attempt targeting remote HTTP endpoint"
    },
    {
      regex: /(?:from\s+now\s+on|new\s+rule|system\s+update:)\s*(?:you\s+(?:must|shall|will)|you\s+are\s+free\s+of)/i,
      tactic: "hypothetical_override",
      weight: 35,
      description: "Simulated system directive trying to alter model core alignment"
    }
  ];

  // Detect zero-width characters (often used to obscure adversarial payloads)
  private static ZERO_WIDTH_REGEX = /[\u200B-\u200D\uFEFF\u202A-\u202E]/;

  // Base64 pattern detecting encoded instruction blocks (at least 28 chars)
  private static BASE64_PAYLOAD_REGEX = /(?:eval|run|decode|execute)?\s*[A-Za-z0-9+/]{28,}={0,2}/g;

  public static analyze(prompt: string): InjectionAnalysisResult {
    const tactics: string[] = [];
    let cumulativeRisk = 0;
    let isJailbreak = false;
    let isExfiltration = false;
    const explanations: string[] = [];

    // 1. Check for Zero-Width Characters
    if (this.ZERO_WIDTH_REGEX.test(prompt)) {
      cumulativeRisk += 30;
      tactics.push("hidden_unicode_steganography");
      explanations.push("Hidden zero-width Unicode characters detected in prompt stream.");
    }

    // 2. Pattern Matching
    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.regex.test(prompt)) {
        cumulativeRisk += pattern.weight;
        tactics.push(pattern.tactic);
        explanations.push(pattern.description);

        if (pattern.tactic === "known_jailbreak_persona" || pattern.tactic === "roleplay_subversion") {
          isJailbreak = true;
        }
        if (pattern.tactic === "data_exfiltration") {
          isExfiltration = true;
        }
      }
    }

    // 3. Base64 payload detection with selective decode check
    const base64Matches = prompt.match(this.BASE64_PAYLOAD_REGEX);
    if (base64Matches) {
      for (const b64 of base64Matches) {
        try {
          const decoded = Buffer.from(b64, "base64").toString("utf-8");
          if (/(?:system|admin|ignore|bypass|password|exec|key)/i.test(decoded)) {
            cumulativeRisk += 40;
            tactics.push("encoded_obfuscation");
            explanations.push("Base64 encoded instruction block containing suspicious keywords.");
            break;
          }
        } catch {
          // Non-critical if decode fails
        }
      }
    }

    const normalizedRisk = Math.min(100, Math.max(0, cumulativeRisk));
    const isInjection = normalizedRisk >= 35;

    return {
      is_injection: isInjection,
      is_jailbreak: isJailbreak,
      is_data_exfiltration_attempt: isExfiltration,
      risk_score: normalizedRisk,
      tactics: Array.from(new Set(tactics)),
      explanation:
        explanations.length > 0
          ? explanations.join(" ")
          : "Prompt adheres to standard conversational format without adversarial indicators."
    };
  }
}
