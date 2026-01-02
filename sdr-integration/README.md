# SDR Integration

This directory contains integration guides and implementation files for connecting various Software Defined Radio (SDR) devices with web-based SDR platforms.

## Available Integrations

### USDR (Wavelet Lab Micro SDR) + OpenWebRX+

The `usdr-openwebrx/` directory contains everything needed to integrate USDR devices with OpenWebRX+:

| File | Description |
|------|-------------|
| `USDR_OpenWebRX_Integration_Guide.md` | Comprehensive step-by-step integration guide |
| `usdr.py` | OpenWebRX+ device connector Python module |
| `feature_patch.py` | Code snippets for patching OpenWebRX+ feature detection |
| `settings_example.yaml` | Example OpenWebRX+ configuration with multiple profiles |
| `install_usdr_openwebrx.sh` | Automated installation script |

#### Quick Start

```bash
# Make the installer executable and run it
chmod +x usdr-openwebrx/install_usdr_openwebrx.sh
sudo ./usdr-openwebrx/install_usdr_openwebrx.sh
```

#### Manual Installation

1. Install usdr-lib:
   ```bash
   sudo add-apt-repository ppa:wavelet-lab/usdr-lib
   sudo apt update
   sudo apt install usdr-tools soapysdr-module-usdr
   ```

2. Copy `usdr.py` to `/usr/lib/python3/dist-packages/owrx/source/`

3. Patch `feature.py` using the snippets in `feature_patch.py`

4. Configure your device in `/etc/openwebrx/settings.yaml`

5. Restart OpenWebRX+: `sudo systemctl restart openwebrx`

## USDR Hardware Specifications

| Specification | Value |
|--------------|-------|
| Frequency Range (RX/TX) | 250 MHz - 3.8 GHz |
| Frequency Range (RX-only) | 1 MHz - 250 MHz |
| Sample Rate | 0.1 MSps - 65 MSps |
| Channel Bandwidth | 0.5 MHz - 40 MHz |
| Interface | M.2 2230 A+E (USB 2.0 & PCIe) |
| RFIC | LMS6002D |
| FPGA | AMD XC7A35T |

## References

- [OpenWebRX+ Home Page](https://fms.komkon.org/OWRX/)
- [usdr-lib GitHub Repository](https://github.com/wavelet-lab/usdr-lib)
- [SoapySDR Framework](https://github.com/pothosware/SoapySDR)
- [OpenWebRX+ GitHub Repository](https://github.com/Luarvique/openwebrx)
