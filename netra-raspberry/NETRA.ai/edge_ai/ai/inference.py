"""
LLM inference engine using llama.cpp.
"""
import logging
from typing import Optional, TYPE_CHECKING
from pathlib import Path

if TYPE_CHECKING:
    from edge_ai.ai.threat_analysis import ThreatAssessment

logger = logging.getLogger(__name__)


class InferenceEngine:
    """
    Manages LLM inference using llama.cpp with model preloading.
    """
    
    def __init__(self, model_path: str, max_tokens: int, temperature: float, 
                 threads: int, timeout: int, failsafe_handler=None):
        """
        Initialize inference engine and preload model.
        
        Args:
            model_path: Path to GGUF model file
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0.0 to 2.0)
            threads: Number of threads for inference
            timeout: Inference timeout in seconds
            failsafe_handler: Optional FailsafeHandler for fallback decisions
        """
        self.model_path = model_path
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.threads = threads
        self.timeout = timeout
        self.failsafe_handler = failsafe_handler
        self.model = None
        
        # Verify model file exists
        if not Path(model_path).exists():
            raise FileNotFoundError(f"Model file not found: {model_path}")
        
        # Preload model
        self._load_model()
    
    def _load_model(self) -> None:
        """
        Load the GGUF model using llama-cpp-python bindings.
        """
        try:
            from llama_cpp import Llama
            
            logger.info(f"Loading model from {self.model_path}")
            self.model = Llama(
                model_path=self.model_path,
                n_threads=self.threads,
                n_ctx=1024,  # Increased context window to 1024 tokens
                verbose=False
            )
            logger.info("Model loaded successfully")
            
        except ImportError:
            logger.error(
                "llama-cpp-python not installed. "
                "Install with: pip install llama-cpp-python"
            )
            raise
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
    
    def generate(self, prompt: str, assessment: Optional['ThreatAssessment'] = None) -> Optional[str]:
        """
        Execute inference and return tactical decision.
        Falls back to rule-based decision if inference fails.
        
        Args:
            prompt: Input prompt for the model
            assessment: Optional threat assessment for fallback
            
        Returns:
            Generated text or fallback decision
        """
        if self.model is None:
            logger.error("Model not loaded")
            if self.failsafe_handler and assessment:
                return self.failsafe_handler.generate_fallback(assessment)
            return None
        
        try:
            logger.info(f"Running inference with prompt: {prompt}")
            
            # Execute inference with better parameters
            output = self.model(
                prompt,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                top_p=0.95,
                top_k=40,
                repeat_penalty=1.15,
                stop=["\n\n", "###"],  # Less aggressive stop tokens
                echo=False
            )
            
            # Extract generated text
            if output and 'choices' in output and len(output['choices']) > 0:
                text = output['choices'][0]['text'].strip()
                
                # Clean up the text - remove any trailing incomplete sentences
                if text:
                    # If text doesn't end with punctuation, try to find last complete sentence
                    if not text[-1] in '.!?':
                        # Find last sentence-ending punctuation
                        last_period = max(text.rfind('.'), text.rfind('!'), text.rfind('?'))
                        if last_period > 0:
                            text = text[:last_period + 1]
                    
                    logger.info(f"Generated decision: {text}")
                    return text
                else:
                    logger.warning("Model generated empty text")
                    if self.failsafe_handler and assessment:
                        return self.failsafe_handler.generate_fallback(assessment)
                    return None
            else:
                logger.warning("No output generated from model")
                if self.failsafe_handler and assessment:
                    return self.failsafe_handler.generate_fallback(assessment)
                return None
                
        except Exception as e:
            logger.error(f"Inference failed: {e}")
            if self.failsafe_handler and assessment:
                return self.failsafe_handler.generate_fallback(assessment)
            return None
    
    def cleanup(self) -> None:
        """
        Release model resources.
        """
        if self.model is not None:
            logger.info("Releasing model resources")
            del self.model
            self.model = None
