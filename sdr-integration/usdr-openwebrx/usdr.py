# USDR (Wavelet Lab Micro SDR) Device Support for OpenWebRX+
# 
# This file provides integration between OpenWebRX+ and USDR devices
# via the SoapySDR hardware abstraction layer.
#
# Installation:
#   Copy this file to /usr/lib/python3/dist-packages/owrx/source/usdr.py
#
# Prerequisites:
#   1. Install usdr-lib and SoapySDR module:
#      sudo add-apt-repository ppa:wavelet-lab/usdr-lib
#      sudo apt update
#      sudo apt install usdr-tools soapysdr-module-usdr libusdr-dev
#
#   2. Verify device detection:
#      SoapySDRUtil --probe="driver=usdr"
#
# Copyright (c) 2025
# SPDX-License-Identifier: MIT

from owrx.source.soapy import SoapyConnectorSource, SoapyConnectorDeviceDescription
from owrx.form.input import Input, TextInput, NumberInput, CheckboxInput
from owrx.form.input.device import GainInput
from owrx.form.input.validator import RangeValidator, Range
from typing import List


class UsdrSource(SoapyConnectorSource):
    """
    SoapySDR connector source for USDR (Wavelet Lab Micro SDR) devices.
    
    This class implements the necessary interface for OpenWebRX+ to
    communicate with USDR devices through the SoapySDR framework.
    """
    
    def getDriver(self):
        """
        Returns the SoapySDR driver identifier for USDR devices.
        This must match the driver name registered by the usdr-lib
        SoapySDR module.
        """
        return "usdr"
    
    def getSoapySettingsMappings(self):
        """
        Maps OpenWebRX+ settings to SoapySDR settings strings.
        These settings are passed to the soapy_connector via the -t option.
        """
        mappings = super().getSoapySettingsMappings()
        mappings.update({
            "loglevel": "loglevel",
            "rx_bw": "rx_bw",
            "tx_bw": "tx_bw",
        })
        return mappings


class UsdrDeviceDescription(SoapyConnectorDeviceDescription):
    """
    Device description for USDR devices in OpenWebRX+.
    
    This class defines the user interface elements and configuration
    options available for USDR devices in the OpenWebRX+ settings panel.
    """
    
    def getName(self):
        """
        Returns the human-readable name for this device type.
        This name is displayed in the OpenWebRX+ device selection UI.
        """
        return "USDR (Wavelet Lab Micro SDR)"
    
    def getInputs(self) -> List[Input]:
        """
        Returns the list of input fields for configuring the USDR device.
        """
        return super().getInputs() + [
            NumberInput(
                "loglevel",
                "Log level",
                infotext="Set the logging verbosity level (0-5, default: 3)",
                validator=RangeValidator(0, 5),
            ),
            NumberInput(
                "rx_bw",
                "RX Bandwidth",
                append="Hz",
                infotext="Set the receive bandwidth filter",
            ),
            NumberInput(
                "tx_bw",
                "TX Bandwidth",
                append="Hz",
                infotext="Set the transmit bandwidth filter",
            ),
        ]
    
    def getDeviceOptionalKeys(self):
        """
        Returns the list of optional device configuration keys.
        """
        return super().getDeviceOptionalKeys() + [
            "loglevel", "rx_bw", "tx_bw"
        ]
    
    def getProfileOptionalKeys(self):
        """
        Returns the list of optional profile configuration keys.
        """
        return super().getProfileOptionalKeys() + [
            "rx_bw", "tx_bw"
        ]
    
    def getSampleRateRanges(self) -> List[Range]:
        """
        Returns the supported sample rate ranges for USDR devices.
        
        The USDR supports sample rates from 0.1 MSps to 65 MSps.
        """
        return [
            Range(100000, 65000000),  # 100 kSps to 65 MSps
        ]
    
    def getGainStages(self):
        """
        Returns the gain stages available on the USDR device.
        
        The USDR uses the LMS6002D RFIC which has LNA, VGA1, and VGA2 stages.
        """
        return ["LNA", "VGA1", "VGA2"]
    
    def hasAgc(self):
        """
        Indicates whether the device supports automatic gain control.
        """
        return False
