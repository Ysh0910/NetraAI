"""
Tactical decision validator and formatter.
"""
import logging
import re

logger = logging.getLogger(__name__)


class TacticalDecisionGenerator:
    """
    Validates and formats AI-generated tactical decisions.
    """
    
    ACTION_VERBS = [
        "move", "take", "hold", "retreat", "advance", "cover",
        "engage", "disengage", "reposition", "maintain", "monitor",
        "evacuate", "secure", "defend", "attack", "withdraw"
    ]
    
    NARRATIVE_PHRASES = [
        "appears to be", "seems like", "might be", "could be",
        "appears", "seems", "looks like", "probably"
    ]
    
    MAX_WORDS = 25  # Allow up to 25 words for intelligent Q&A responses
    
    def validate_decision(self, raw_output: str) -> str:
        """
        Validate and clean AI output.
        
        Args:
            raw_output: Raw text from AI model
            
        Returns:
            Validated and cleaned tactical decision
        """
        if not raw_output or not raw_output.strip():
            logger.warning("Empty decision received, using fallback")
            return "Assess situation and await orders."
        
        # Clean the output
        decision = raw_output.strip()
        
        # Remove narrative phrases
        for phrase in self.NARRATIVE_PHRASES:
            if phrase in decision.lower():
                logger.debug(f"Removing narrative phrase: {phrase}")
                decision = re.sub(
                    re.escape(phrase),
                    "",
                    decision,
                    flags=re.IGNORECASE
                ).strip()
        
        # If decision became empty after cleaning, use original
        if not decision:
            decision = raw_output.strip()
        
        # Check word count
        words = decision.split()
        if len(words) > self.MAX_WORDS:
            logger.warning(
                f"Decision exceeds {self.MAX_WORDS} words ({len(words)}), truncating"
            )
            decision = self._truncate_at_sentence(decision, self.MAX_WORDS)
        
        # Verify action verb presence (warning only, don't reject)
        has_action_verb = any(
            verb in decision.lower() for verb in self.ACTION_VERBS
        )
        
        if not has_action_verb:
            logger.warning(
                f"Decision lacks action verb: {decision}"
            )
            # Don't reject - LLM output is still valid tactical information
        
        # Format the decision
        decision = self.format_decision(decision)
        
        # Final safety check
        if not decision or len(decision) < 3:
            logger.error(f"Decision too short after validation: '{decision}'")
            return "Maintain position and monitor."
        
        return decision
    
    def format_decision(self, decision: str) -> str:
        """
        Ensure proper capitalization and punctuation.
        
        Args:
            decision: Decision text to format
            
        Returns:
            Properly formatted decision
        """
        if not decision:
            return ""
        
        # Capitalize first letter
        decision = decision[0].upper() + decision[1:] if len(decision) > 1 else decision.upper()
        
        # Ensure ends with period
        if not decision.endswith(('.', '!', '?')):
            decision += '.'
        
        return decision
    
    def _truncate_at_sentence(self, text: str, max_words: int) -> str:
        """
        Truncate text at the last complete sentence within word limit.
        
        Args:
            text: Text to truncate
            max_words: Maximum number of words
            
        Returns:
            Truncated text
        """
        words = text.split()
        
        if len(words) <= max_words:
            return text
        
        # Find last sentence boundary within limit
        truncated_words = words[:max_words]
        truncated_text = ' '.join(truncated_words)
        
        # Look for sentence endings
        for delimiter in ['.', '!', '?']:
            if delimiter in truncated_text:
                # Keep up to last sentence ending
                last_idx = truncated_text.rfind(delimiter)
                return truncated_text[:last_idx + 1]
        
        # No sentence boundary found, just truncate at word limit
        return truncated_text + '.'
