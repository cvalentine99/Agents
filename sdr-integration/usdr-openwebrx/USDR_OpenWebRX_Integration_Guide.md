# Integrating USDR Devices with OpenWebRX+

## 1. Introduction

This guide provides comprehensive, step-by-step instructions for integrating the Wavelet Lab uSDR (Micro SDR) device with OpenWebRX+, a popular open-source, web-based SDR receiver platform. The integration is achieved by leveraging the SoapySDR hardware abstraction library, which allows OpenWebRX+ to communicate with a wide range of SDR devices in a vendor-neutral manner.

The uSDR is a compact, M.2 form-factor SDR with a wide frequency range and flexible connectivity options. By following this guide, you will be able to connect your uSDR device to OpenWebRX+ and access it remotely through the OpenWebRX+ web interface.

## 2. Prerequisites

Before you begin, ensure you have the following:

*   **Hardware:**
    *   A Wavelet Lab uSDR device.
    *   A computer running a supported Debian-based Linux distribution (e.g., Ubuntu 20.04/22.04).
*   **Software:**
    *   OpenWebRX+ installed and running. If you have not yet installed OpenWebRX+, please follow the official [OpenWebRX+ installation guide](https://fms.komkon.org/OWRX/#InstallGuide).
    *   Sudo/root privileges on your system.

## 3. Integration Steps

### Step 1: Install `usdr-lib` and the SoapySDR Module

The first step is to install the `usdr-lib` library and the corresponding SoapySDR module. This provides the necessary drivers for the uSDR device and allows it to be recognized by the SoapySDR framework.

For Ubuntu 20.04 and later, the recommended method is to use the official PPA:

```bash
sudo add-apt-repository ppa:wavelet-lab/usdr-lib
sudo apt update
sudo apt install usdr-tools soapysdr-module-usdr libusdr-dev
```

For other Debian-based distributions, you may need to build `usdr-lib` from source. Please refer to the [usdr-lib GitHub repository](https://github.com/wavelet-lab/usdr-lib) for detailed instructions.

### Step 2: Verify SoapySDR Installation

Once the `usdr-lib` and SoapySDR module are installed, you should verify that the uSDR device is correctly detected by SoapySDR. You can do this using the `SoapySDRUtil` command-line tool.

First, check if the `usdr` module is listed as an available SoapySDR module:

```bash
SoapySDRUtil --info
```

You should see `usdr` in the list of found modules.

Next, probe for the uSDR device specifically:

```bash
SoapySDRUtil --probe="driver=usdr"
```

If the device is detected correctly, you will see detailed information about the uSDR hardware.

### Step 3: Create a Custom OpenWebRX+ Device File

To add support for the uSDR device to OpenWebRX+, you need to create a new Python device file. This file will define the necessary classes for OpenWebRX+ to recognize and interact with the uSDR device through SoapySDR.

Create a new file named `usdr.py` in the `/usr/lib/python3/dist-packages/owrx/source/` directory (or the equivalent path for your OpenWebRX+ installation).

```python
# /usr/lib/python3/dist-packages/owrx/source/usdr.py

from owrx.source.soapy import SoapyConnectorSource, SoapyConnectorDeviceDescription

class UsdrSource(SoapyConnectorSource):
    def getDriver(self):
        return "usdr"

class UsdrDeviceDescription(SoapyConnectorDeviceDescription):
    def getName(self):
        return "USDR (Wavelet Lab Micro SDR)"
```

This file defines two classes:

*   `UsdrSource`: This class inherits from `SoapyConnectorSource` and specifies the SoapySDR driver name (`usdr`) for the device.
*   `UsdrDeviceDescription`: This class inherits from `SoapyConnectorDeviceDescription` and provides a human-readable name for the device that will be displayed in the OpenWebRX+ web interface.

### Step 4: Add the New Device to OpenWebRX+ Feature Detection

Next, you need to modify the OpenWebRX+ feature detection mechanism to recognize the new `usdr` device type. This involves editing the `feature.py` file.

Open the file `/usr/lib/python3/dist-packages/owrx/feature.py` and make the following changes:

1.  **Add the `usdr` feature to the `features` dictionary:**

    ```python
    features = {
        # ... existing features
        "usdr": ["soapy_connector", "soapy_usdr"],
        # ... existing features
    }
    ```

2.  **Add a `has_soapy_usdr` method to the `FeatureDetector` class:**

    ```python
    class FeatureDetector(object):
        # ... existing methods

        def has_soapy_usdr(self):
            """
            The [SoapySDR module for USDR](https://github.com/wavelet-lab/usdr-lib)
            is required for interfacing with Wavelet Lab uSDR devices.
            """
            return self._has_soapy_driver("usdr")

        # ... existing methods
    ```

These changes will allow OpenWebRX+ to check for the presence of the `usdr` SoapySDR driver and enable the `usdr` device type if it is found.

### Step 5: Configure the USDR Device in `settings.yaml`

Now, you need to add the uSDR device to your OpenWebRX+ configuration file, `settings.yaml`. This file is typically located in `/etc/openwebrx/`.

Add the following snippet to the `sdr_devices` section of your `settings.yaml` file:

```yaml
sdr_devices:
  - type: usdr
    device: 'driver=usdr'
    name: 'USDR'
    profiles:
      - name: 'Default'
        center_freq: 433000000
        samp_rate: 2048000
        rf_gain: 20
        antenna: 'RX'
```

This configuration defines a new SDR device with the following parameters:

*   `type`: `usdr` (the new device type you created)
*   `device`: `'driver=usdr'` (the SoapySDR device string)
*   `name`: A user-defined name for the device (e.g., 'USDR')
*   `profiles`: A list of profiles for the device, each with its own settings for center frequency, sample rate, gain, and antenna.

### Step 6: Restart OpenWebRX+ and Verify

Finally, restart the OpenWebRX+ service to apply the changes:

```bash
sudo systemctl restart openwebrx
```

Now, open the OpenWebRX+ web interface in your browser. If the integration was successful, you should see the 'USDR' device listed in the device selection menu. You can now select the device and start using it with OpenWebRX+.

## 4. Troubleshooting

*   **Device not detected:** If the uSDR device is not detected, double-check that the `usdr-lib` and `soapysdr-module-usdr` packages are installed correctly. Use `SoapySDRUtil --probe="driver=usdr"` to verify that the device is accessible to SoapySDR.
*   **OpenWebRX+ service fails to start:** Check the OpenWebRX+ logs for any errors. The logs are typically located in `/var/log/openwebrx/`. Common issues include syntax errors in the `settings.yaml` file or incorrect paths to the custom device file.
*   **No data from the device:** Ensure that the antenna is properly connected and that the gain settings are appropriate for the signal you are trying to receive.

## 5. References

[1] OpenWebRX+ Home Page. [https://fms.komkon.org/OWRX/](https://fms.komkon.org/OWRX/)
[2] wavelet-lab/usdr-lib on GitHub. [https://github.com/wavelet-lab/usdr-lib](https://github.com/wavelet-lab/usdr-lib)
[3] Luarvique/openwebrx on GitHub. [https://github.com/Luarvique/openwebrx](https://github.com/Luarvique/openwebrx)
[4] jketterl/owrx_connector on GitHub. [https://github.com/jketterl/owrx_connector](https://github.com/jketterl/owrx_connector)
[5] pothosware/SoapySDR on GitHub. [https://github.com/pothosware/SoapySDR](https://github.com/pothosware/SoapySDR)
