# Feature Detection Patch for USDR Support in OpenWebRX+
#
# This file contains the code snippets that need to be added to
# /usr/lib/python3/dist-packages/owrx/feature.py to enable USDR support.
#
# INSTRUCTIONS:
# 1. Open /usr/lib/python3/dist-packages/owrx/feature.py
# 2. Add the following line to the 'features' dictionary (around line 52-78):
#
#    "usdr": ["soapy_connector", "soapy_usdr"],
#
# 3. Add the following method to the FeatureDetector class (around line 450):

"""
    def has_soapy_usdr(self):
        \"\"\"
        The [SoapySDR module for USDR](https://github.com/wavelet-lab/usdr-lib)
        is required for interfacing with Wavelet Lab uSDR devices. The uSDR
        is a compact, M.2 form-factor SDR with a wide frequency range.
        
        You can install the `soapysdr-module-usdr` package from the Wavelet Lab
        PPA:
        
        ```
        sudo add-apt-repository ppa:wavelet-lab/usdr-lib
        sudo apt update
        sudo apt install soapysdr-module-usdr
        ```
        \"\"\"
        return self._has_soapy_driver("usdr")
"""

# EXAMPLE: Complete features dictionary with USDR added:
#
# features = {
#     # core features; we won't start without these
#     "core": ["csdr"],
#     # different types of sdrs and their requirements
#     "rtl_sdr": ["rtl_connector"],
#     "rtl_sdr_soapy": ["soapy_connector", "soapy_rtl_sdr"],
#     "rtl_tcp": ["rtl_tcp_connector"],
#     "sdrplay": ["soapy_connector", "soapy_sdrplay"],
#     "usdr": ["soapy_connector", "soapy_usdr"],  # <-- ADD THIS LINE
#     "hackrf": ["soapy_connector", "soapy_hackrf"],
#     # ... rest of features
# }
