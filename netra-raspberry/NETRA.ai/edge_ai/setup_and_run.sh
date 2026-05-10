#!/bin/bash

################################################################################
# Edge AI Copilot - Complete Setup and Run Script
# 
# This script:
# 1. Checks all dependencies
# 2. Installs missing components
# 3. Downloads LLM model if needed
# 4. Runs comprehensive tests
# 5. Starts the Edge AI Copilot
#
# Handles "externally-managed-environment" error automatically
################################################################################

set +e  # Don't exit on error - we handle errors gracefully

# ============================================================================
# COLORS AND FORMATTING
# ============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# ============================================================================
# CONFIGURATION
# ============================================================================
MODEL_PATH="models/tinyllama.gguf"
MODEL_URL="https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"
EXPECTED_MODEL_SIZE_MIN=600000000  # ~600MB
VENV_DIR="venv"
USE_VENV=false

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

print_banner() {
    clear
    echo -e "${CYAN}"
    cat << "EOF"
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║                   EDGE AI COPILOT - SETUP & RUN                       ║
║                                                                       ║
║              Autonomous Battlefield Edge AI for Raspberry Pi          ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}${BOLD}$1${NC}"
    echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

print_step() {
    echo -e "${MAGENTA}▶ $1${NC}"
}

# ============================================================================
# SYSTEM CHECKS
# ============================================================================

check_system_info() {
    print_header "SYSTEM INFORMATION"
    
    # OS Information
    if [ -f /etc/os-release ]; then
        OS_NAME=$(grep "^PRETTY_NAME" /etc/os-release | cut -d'"' -f2)
        print_info "OS: $OS_NAME"
    fi
    
    # Raspberry Pi Detection
    if [ -f /proc/device-tree/model ]; then
        PI_MODEL=$(cat /proc/device-tree/model 2>/dev/null | tr -d '\0')
        print_info "Device: $PI_MODEL"
    fi
    
    # CPU Information
    if [ -f /proc/cpuinfo ]; then
        CPU_COUNT=$(grep -c ^processor /proc/cpuinfo)
        print_info "CPU Cores: $CPU_COUNT"
    fi
    
    # Memory Information
    if command -v free &> /dev/null; then
        TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
        AVAIL_MEM=$(free -m | awk '/^Mem:/{print $7}')
        print_info "Total RAM: ${TOTAL_MEM} MB"
        print_info "Available RAM: ${AVAIL_MEM} MB"
        
        if [ "$AVAIL_MEM" -lt 1000 ]; then
            print_warning "Low available memory (< 1GB). Model loading may be slow."
        fi
    fi
    
    # Python Version
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
        print_info "Python: $PYTHON_VERSION"
    else
        print_error "Python3 not found"
        return 1
    fi
    
    return 0
}

# ============================================================================
# DEPENDENCY INSTALLATION
# ============================================================================

check_and_install_system_deps() {
    print_header "CHECKING SYSTEM DEPENDENCIES"
    
    local deps_needed=()
    
    # Check for required system packages
    print_step "Checking system packages..."
    
    if ! command -v wget &> /dev/null; then
        deps_needed+=("wget")
    fi
    
    if ! dpkg -l | grep -q "build-essential"; then
        deps_needed+=("build-essential")
    fi
    
    if ! dpkg -l | grep -q "cmake"; then
        deps_needed+=("cmake")
    fi
    
    if ! dpkg -l | grep -q "libopenblas-dev"; then
        deps_needed+=("libopenblas-dev")
    fi
    
    if [ ${#deps_needed[@]} -eq 0 ]; then
        print_success "All system dependencies installed"
        return 0
    fi
    
    print_warning "Missing system packages: ${deps_needed[*]}"
    print_step "Installing system dependencies..."
    
    sudo apt-get update -qq
    if sudo apt-get install -y "${deps_needed[@]}"; then
        print_success "System dependencies installed"
        return 0
    else
        print_error "Failed to install system dependencies"
        return 1
    fi
}

detect_python_environment() {
    print_header "DETECTING PYTHON ENVIRONMENT"
    
    # Check if we're already in a virtual environment
    if [ -n "$VIRTUAL_ENV" ]; then
        print_success "Already in virtual environment: $VIRTUAL_ENV"
        USE_VENV=true
        return 0
    fi
    
    # Check if venv exists
    if [ -d "$VENV_DIR" ]; then
        print_info "Virtual environment found at: $VENV_DIR"
        echo ""
        read -p "Use existing virtual environment? (y/n): " use_existing
        if [ "$use_existing" = "y" ] || [ "$use_existing" = "Y" ]; then
            source "$VENV_DIR/bin/activate"
            USE_VENV=true
            print_success "Activated virtual environment"
            return 0
        fi
    fi
    
    # Check for externally-managed-environment
    if pip3 install --help &> /dev/null; then
        # Try a test install to see if we get the error
        if pip3 install --dry-run --quiet pip 2>&1 | grep -q "externally-managed-environment"; then
            print_warning "Detected externally-managed Python environment"
            echo ""
            echo "Choose installation method:"
            echo "  1) Virtual environment (recommended, safe)"
            echo "  2) System-wide with --break-system-packages (simpler)"
            echo ""
            read -p "Enter choice (1 or 2): " choice
            
            if [ "$choice" = "1" ]; then
                create_virtual_environment
                return $?
            elif [ "$choice" = "2" ]; then
                print_warning "Using system-wide installation"
                USE_VENV=false
                return 0
            else
                print_error "Invalid choice"
                return 1
            fi
        fi
    fi
    
    # No restrictions detected
    print_info "No Python environment restrictions detected"
    USE_VENV=false
    return 0
}

create_virtual_environment() {
    print_step "Creating virtual environment..."
    
    # Install python3-venv if needed
    if ! python3 -m venv --help &>/dev/null; then
        print_step "Installing python3-venv..."
        sudo apt-get update -qq
        sudo apt-get install -y python3-venv
    fi
    
    # Create venv
    if python3 -m venv "$VENV_DIR"; then
        print_success "Virtual environment created"
        source "$VENV_DIR/bin/activate"
        USE_VENV=true
        
        # Upgrade pip
        print_step "Upgrading pip..."
        pip install --upgrade pip --quiet
        
        return 0
    else
        print_error "Failed to create virtual environment"
        return 1
    fi
}

install_python_dependencies() {
    print_header "INSTALLING PYTHON DEPENDENCIES"
    
    # Determine pip command
    if [ "$USE_VENV" = true ]; then
        PIP_CMD="pip"
        PIP_FLAGS=""
    else
        PIP_CMD="pip3"
        PIP_FLAGS="--break-system-packages"
    fi
    
    # Check paho-mqtt
    print_step "Checking paho-mqtt..."
    if python3 -c "import paho.mqtt.client" 2>/dev/null; then
        print_success "paho-mqtt already installed"
    else
        print_step "Installing paho-mqtt..."
        if $PIP_CMD install paho-mqtt $PIP_FLAGS --quiet; then
            print_success "paho-mqtt installed"
        else
            print_error "Failed to install paho-mqtt"
            return 1
        fi
    fi
    
    # Check llama-cpp-python
    print_step "Checking llama-cpp-python..."
    if python3 -c "import llama_cpp" 2>/dev/null; then
        LLAMA_VERSION=$(python3 -c "import llama_cpp; print(llama_cpp.__version__)" 2>/dev/null || echo "unknown")
        print_success "llama-cpp-python already installed (version: $LLAMA_VERSION)"
    else
        print_warning "llama-cpp-python not installed"
        print_step "Building llama-cpp-python with OpenBLAS optimization..."
        print_info "This may take 10-15 minutes on Raspberry Pi..."
        echo ""
        
        if CMAKE_ARGS="-DLLAMA_BLAS=ON -DLLAMA_BLAS_VENDOR=OpenBLAS" \
           $PIP_CMD install llama-cpp-python --no-cache-dir $PIP_FLAGS; then
            print_success "llama-cpp-python installed successfully"
        else
            print_error "Failed to install llama-cpp-python"
            return 1
        fi
    fi
    
    return 0
}

# ============================================================================
# MODEL MANAGEMENT
# ============================================================================

check_and_download_model() {
    print_header "CHECKING LLM MODEL"
    
    # Create models directory
    mkdir -p models
    
    # Check if model exists
    if [ -f "$MODEL_PATH" ]; then
        MODEL_SIZE=$(stat -c%s "$MODEL_PATH" 2>/dev/null || stat -f%z "$MODEL_PATH" 2>/dev/null)
        MODEL_SIZE_MB=$((MODEL_SIZE / 1024 / 1024))
        
        print_success "Model file found: $MODEL_PATH"
        print_info "Model size: ${MODEL_SIZE_MB} MB"
        
        # Verify size
        if [ "$MODEL_SIZE" -lt "$EXPECTED_MODEL_SIZE_MIN" ]; then
            print_warning "Model file seems too small (expected ~637MB)"
            print_step "Re-downloading model..."
            rm -f "$MODEL_PATH"
            download_model
            return $?
        fi
        
        return 0
    else
        print_warning "Model file not found"
        download_model
        return $?
    fi
}

download_model() {
    print_step "Downloading TinyLlama 1.1B Q4_K_M model (~637 MB)..."
    print_info "This may take 5-15 minutes depending on your connection..."
    echo ""
    
    if wget --show-progress --progress=bar:force:noscroll \
            "$MODEL_URL" -O "$MODEL_PATH" 2>&1 | \
            grep --line-buffered -oP '\d+%|\d+[KMG]'; then
        echo ""
        print_success "Model downloaded successfully"
        
        # Verify download
        if [ -f "$MODEL_PATH" ]; then
            MODEL_SIZE=$(stat -c%s "$MODEL_PATH" 2>/dev/null || stat -f%z "$MODEL_PATH" 2>/dev/null)
            MODEL_SIZE_MB=$((MODEL_SIZE / 1024 / 1024))
            print_info "Downloaded size: ${MODEL_SIZE_MB} MB"
            
            if [ "$MODEL_SIZE" -lt "$EXPECTED_MODEL_SIZE_MIN" ]; then
                print_error "Downloaded file is too small"
                return 1
            fi
            
            return 0
        else
            print_error "Download completed but file not found"
            return 1
        fi
    else
        echo ""
        print_error "Failed to download model"
        print_info "You can manually download it with:"
        echo "  wget $MODEL_URL -O $MODEL_PATH"
        return 1
    fi
}

# ============================================================================
# TESTING
# ============================================================================

run_comprehensive_tests() {
    print_header "RUNNING COMPREHENSIVE TESTS"
    
    # Test 1: Import test
    print_step "Test 1: Checking Python imports..."
    if python3 << 'PYTHON_EOF'
import sys
try:
    import paho.mqtt.client
    print("  ✓ paho-mqtt import OK")
except ImportError as e:
    print(f"  ✗ paho-mqtt import failed: {e}")
    sys.exit(1)

try:
    import llama_cpp
    print(f"  ✓ llama-cpp-python import OK (version: {llama_cpp.__version__})")
except ImportError as e:
    print(f"  ✗ llama-cpp-python import failed: {e}")
    sys.exit(1)

print("  ✓ All imports successful")
PYTHON_EOF
    then
        print_success "Import test passed"
    else
        print_error "Import test failed"
        return 1
    fi
    
    echo ""
    
    # Test 2: Model loading test
    print_step "Test 2: Loading LLM model..."
    if python3 << PYTHON_EOF
import sys
import time
from llama_cpp import Llama

try:
    print("  Loading model: $MODEL_PATH")
    start = time.time()
    llm = Llama(
        model_path="$MODEL_PATH",
        n_threads=2,
        n_ctx=512,
        verbose=False
    )
    load_time = time.time() - start
    print(f"  ✓ Model loaded in {load_time:.2f} seconds")
    del llm
except Exception as e:
    print(f"  ✗ Model loading failed: {e}")
    sys.exit(1)
PYTHON_EOF
    then
        print_success "Model loading test passed"
    else
        print_error "Model loading test failed"
        return 1
    fi
    
    echo ""
    
    # Test 3: Inference test
    print_step "Test 3: Running inference test..."
    if python3 << 'PYTHON_EOF'
import sys
import time
from llama_cpp import Llama

try:
    # Load model
    llm = Llama(
        model_path="models/tinyllama.gguf",
        n_threads=2,
        n_ctx=512,
        verbose=False
    )
    
    # Format prompt
    prompt = "<|system|>\nYou are a tactical military AI assistant.</s>\n<|user|>\nEnemy at 50 meters. What action?</s>\n<|assistant|>\n"
    
    # Run inference
    print("  Generating tactical decision...")
    start = time.time()
    output = llm(
        prompt,
        max_tokens=50,
        temperature=0.5,
        top_p=0.9,
        repeat_penalty=1.1,
        stop=["</s>", "<|", "\n\n"],
        echo=False
    )
    inference_time = time.time() - start
    
    # Extract response
    if output and 'choices' in output and len(output['choices']) > 0:
        response = output['choices'][0]['text'].strip()
        if response and len(response) > 3:
            print(f"  ✓ Generated: {response}")
            print(f"  ✓ Inference time: {inference_time:.2f} seconds")
        else:
            print(f"  ✗ Empty or invalid response")
            sys.exit(1)
    else:
        print(f"  ✗ No output generated")
        sys.exit(1)
    
    del llm
    
except Exception as e:
    print(f"  ✗ Inference test failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
PYTHON_EOF
    then
        print_success "Inference test passed"
    else
        print_error "Inference test failed"
        return 1
    fi
    
    echo ""
    
    # Test 4: Configuration validation
    print_step "Test 4: Validating configuration..."
    if python3 << 'PYTHON_EOF'
import sys
sys.path.insert(0, '.')

try:
    from edge_ai.config import Config
    Config.validate()
    print("  ✓ Configuration valid")
    print(f"  ✓ MQTT Broker: {Config.MQTT_BROKER_HOST}:{Config.MQTT_BROKER_PORT}")
    print(f"  ✓ Model: {Config.MODEL_PATH}")
except Exception as e:
    print(f"  ✗ Configuration validation failed: {e}")
    sys.exit(1)
PYTHON_EOF
    then
        print_success "Configuration test passed"
    else
        print_error "Configuration test failed"
        return 1
    fi
    
    echo ""
    print_success "All tests passed!"
    return 0
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    print_banner
    
    print_info "Date: $(date)"
    print_info "Working Directory: $(pwd)"
    echo ""
    
    # Step 1: System information
    if ! check_system_info; then
        print_error "System check failed"
        exit 1
    fi
    
    # Step 2: System dependencies
    if ! check_and_install_system_deps; then
        print_error "Failed to install system dependencies"
        exit 1
    fi
    
    # Step 3: Python environment
    if ! detect_python_environment; then
        print_error "Failed to setup Python environment"
        exit 1
    fi
    
    # Step 4: Python dependencies
    if ! install_python_dependencies; then
        print_error "Failed to install Python dependencies"
        exit 1
    fi
    
    # Step 5: Model download
    if ! check_and_download_model; then
        print_error "Failed to setup model"
        exit 1
    fi
    
    # Step 6: Run tests
    if ! run_comprehensive_tests; then
        print_error "Tests failed"
        echo ""
        print_info "Please review the errors above and try again"
        exit 1
    fi
    
    # Step 7: Ready to run
    print_header "SETUP COMPLETE"
    print_success "All dependencies installed and tested"
    echo ""
    
    # Ask if user wants to start the copilot
    echo -e "${CYAN}${BOLD}Ready to start Edge AI Copilot?${NC}"
    echo ""
    read -p "Start now? (y/n): " start_now
    
    if [ "$start_now" = "y" ] || [ "$start_now" = "Y" ]; then
        echo ""
        print_header "STARTING EDGE AI COPILOT"
        echo ""
        
        # Activate venv if needed
        if [ "$USE_VENV" = true ] && [ -z "$VIRTUAL_ENV" ]; then
            source "$VENV_DIR/bin/activate"
        fi
        
        # Run the copilot
        python3 main.py
    else
        echo ""
        print_info "To start the copilot later, run:"
        if [ "$USE_VENV" = true ]; then
            echo "  source $VENV_DIR/bin/activate"
        fi
        echo "  python3 main.py"
        echo ""
    fi
}

# Run main function
main
