// Site model configuration for SC
// Auto-generated from AVEVA Batch Unit Export
var MODEL_DATA = {
  "processes": {
    "sFormulation": {
      "units": [
        "sUForm5111",
        "sUForm5121"
      ],
      "phases": {
        "setTempLimit": [
          {
            "name": "temperatureHH",
            "type": "Process"
          },
          {
            "name": "temperatureH",
            "type": "Process"
          },
          {
            "name": "temperatureL",
            "type": "Process"
          }
        ],
        "mixerOn": [
          {
            "name": "setpointLevelMin",
            "type": "Process"
          },
          {
            "name": "setpointLevelMax",
            "type": "Process"
          }
        ],
        "mixerOff": [],
        "feedPWater": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          },
          {
            "name": "selectValve",
            "type": "Process"
          }
        ],
        "feedCipWater": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "pressureCWater",
            "type": "Process"
          },
          {
            "name": "valve1st",
            "type": "Process"
          },
          {
            "name": "valve2nd",
            "type": "Process"
          },
          {
            "name": "valve3rd",
            "type": "Process"
          },
          {
            "name": "valve4th",
            "type": "Process"
          },
          {
            "name": "ratio2nd",
            "type": "Process"
          },
          {
            "name": "ratio3rd",
            "type": "Process"
          },
          {
            "name": "ratio4th",
            "type": "Process"
          },
          {
            "name": "cycles",
            "type": "Process"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          }
        ],
        "circulatePump": [
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "time",
            "type": "Process"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          }
        ],
        "circulateMaxShea": [
          {
            "name": "time",
            "type": "Process"
          },
          {
            "name": "speedMaxShear",
            "type": "Process"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          }
        ],
        "coolingOff": [],
        "coolingOn": [
          {
            "name": "setpointTemp",
            "type": "Process"
          }
        ],
        "feedClycol": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          }
        ],
        "drain51x1CircMx": [],
        "drain51x1Hold": [],
        "drain51x1MxNoTk": [],
        "drain51x1MxTank": [],
        "transfer": [
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "transferOrDosing",
            "type": "Process"
          }
        ],
        "millingPassage": [
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "setpTemperature",
            "type": "Process"
          },
          {
            "name": "speedMill",
            "type": "Process"
          },
          {
            "name": "setpPressure",
            "type": "Process"
          },
          {
            "name": "tempCtrlOn",
            "type": "Process"
          },
          {
            "name": "pressCtrlOn",
            "type": "Process"
          }
        ],
        "feed": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          }
        ],
        "flushGlycol": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          }
        ],
        "flushProcessWtr": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          }
        ],
        "flushCipWtr": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          },
          {
            "name": "pressureCWater",
            "type": "Process"
          }
        ],
        "runEmpty": [
          {
            "name": "addProcessTime",
            "type": "Process"
          },
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feed3341ToFormul": [
          {
            "name": "quantityProduct",
            "type": "Material"
          },
          {
            "name": "quantityCip",
            "type": "Material"
          },
          {
            "name": "cycles",
            "type": "Process"
          },
          {
            "name": "pressureCWater",
            "type": "Process"
          }
        ],
        "feed3351ToFormu": [
          {
            "name": "quantityProduct",
            "type": "Material"
          },
          {
            "name": "quantityCip",
            "type": "Material"
          },
          {
            "name": "cycles",
            "type": "Process"
          },
          {
            "name": "pressureCWater",
            "type": "Process"
          }
        ],
        "flush3351ToFormu": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "pressureCWater",
            "type": "Process"
          },
          {
            "name": "selectValve",
            "type": "Process"
          }
        ],
        "feedPregel": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          },
          {
            "name": "speedPump",
            "type": "Process"
          }
        ]
      }
    },
    "mPregel1": {
      "units": [
        "mU3321Pregel"
      ],
      "phases": {
        "setTempLimit": [
          {
            "name": "temperatureHH",
            "type": "Process"
          },
          {
            "name": "temperatureH",
            "type": "Process"
          },
          {
            "name": "temperatureL",
            "type": "Process"
          }
        ],
        "dissolverOn": [
          {
            "name": "speed",
            "type": "Process"
          }
        ],
        "dissolverOff": [],
        "disperging": [
          {
            "name": "time",
            "type": "Process"
          },
          {
            "name": "speedDissolver",
            "type": "Process"
          }
        ],
        "feedPowder3321": [
          {
            "name": "speedDissolver",
            "type": "Process"
          },
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feedCleanWater": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feedProcWater": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feedProcWaterSB": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feedCleanWaterSB": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feedProcWaterSpN": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feed3341To3321FW": [
          {
            "name": "quantityProcWat",
            "type": "Process"
          }
        ],
        "feed3341To3321": [
          {
            "name": "quantityProduct",
            "type": "Material"
          },
          {
            "name": "quantityCleanWat",
            "type": "Process"
          },
          {
            "name": "cycles",
            "type": "Process"
          }
        ]
      }
    },
    "mPregel2": {
      "units": [
        "mU3322Pregel"
      ],
      "phases": {
        "setTempLimit": [
          {
            "name": "temperatureHH",
            "type": "Process"
          },
          {
            "name": "temperatureH",
            "type": "Process"
          },
          {
            "name": "temperatureL",
            "type": "Process"
          }
        ],
        "dissolverOn": [
          {
            "name": "speed",
            "type": "Process"
          }
        ],
        "dissolverOff": [],
        "disperging": [
          {
            "name": "time",
            "type": "Process"
          },
          {
            "name": "speedDissolver",
            "type": "Process"
          }
        ],
        "feedPowder3322": [
          {
            "name": "speedDissolver",
            "type": "Process"
          },
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feedCleanWater": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feedProcWater": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feedProcWaterSB": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feedCleanWaterSB": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feedProcWaterSpN": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feed3341To3322FW": [
          {
            "name": "quantityProcWat",
            "type": "Process"
          }
        ],
        "feed3341To3322": [
          {
            "name": "quantityProduct",
            "type": "Material"
          },
          {
            "name": "quantityCleanWat",
            "type": "Process"
          },
          {
            "name": "cycles",
            "type": "Process"
          }
        ],
        "feedPreg2ToPrem": [
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feedPreg2ToForm": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "speedPump",
            "type": "Process"
          }
        ]
      }
    },
    "sMilling": {
      "units": [
        "sUMilling"
      ],
      "phases": {
        "coolingOff4211": [],
        "coolingOn4211": [
          {
            "name": "setpointTemp",
            "type": "Process"
          }
        ],
        "mixerOn": [
          {
            "name": "setpointLevelMin",
            "type": "Process"
          },
          {
            "name": "setpointLevelMax",
            "type": "Process"
          }
        ],
        "mixerOff": [],
        "feedCipWater4211": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "pressureCWater",
            "type": "Process"
          },
          {
            "name": "valve1st",
            "type": "Process"
          },
          {
            "name": "cycles",
            "type": "Process"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          },
          {
            "name": "valve2nd",
            "type": "Process"
          },
          {
            "name": "valve3nd",
            "type": "Process"
          },
          {
            "name": "valve4th",
            "type": "Process"
          },
          {
            "name": "ratio2nd",
            "type": "Process"
          },
          {
            "name": "ratio3rd",
            "type": "Process"
          },
          {
            "name": "ratio4th",
            "type": "Process"
          }
        ],
        "setTempLimit": [
          {
            "name": "temperatureHH",
            "type": "Process"
          },
          {
            "name": "temperatureH",
            "type": "Process"
          },
          {
            "name": "temperatureL",
            "type": "Process"
          }
        ],
        "millingCycling": [
          {
            "name": "speedMill",
            "type": "Process"
          },
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "setpTemperature",
            "type": "Process"
          },
          {
            "name": "setpPressure",
            "type": "Process"
          },
          {
            "name": "setpEnergy",
            "type": "Process"
          },
          {
            "name": "tempCtrlOn",
            "type": "Process"
          },
          {
            "name": "pressCtrlOn",
            "type": "Process"
          }
        ],
        "drainMillOnly": [],
        "drain4211before": [],
        "drain4211to5111": [],
        "drain4211to5121": [],
        "drainMillPipe": [],
        "tran3811To4211NP": [
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "transferOrDosing",
            "type": "Process"
          }
        ],
        "millingPassage": [
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "setpTemperature",
            "type": "Process"
          },
          {
            "name": "speedMill",
            "type": "Process"
          },
          {
            "name": "setpPressure",
            "type": "Process"
          },
          {
            "name": "tempCtrlOn",
            "type": "Process"
          },
          {
            "name": "pressCtrlOn",
            "type": "Process"
          }
        ],
        "tran3811To4211FR": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "transferOrDosing",
            "type": "Process"
          },
          {
            "name": "speedMill",
            "type": "Process"
          },
          {
            "name": "speedPump",
            "type": "Process"
          }
        ],
        "tran3811To4211PM": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "transferOrDosing",
            "type": "Process"
          },
          {
            "name": "chamberPress",
            "type": "Process"
          },
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "speedRotor",
            "type": "Process"
          }
        ]
      }
    },
    "sTP": {
      "units": [
        "sUTp_3311_prcW",
        "sUTp_3311_glycol"
      ],
      "phases": {
        "feed": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ]
      }
    },
    "sTPcip": {
      "units": [
        "sUTp_3311_cipW"
      ],
      "phases": {
        "feed": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "pressureCWater",
            "type": "Process"
          }
        ]
      }
    },
    "sWP1": {
      "units": [
        "sUwp1_3321"
      ],
      "phases": {
        "feed": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          }
        ],
        "flushGlycol": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          }
        ],
        "flushProcessWtr": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          }
        ],
        "flushCipWtr": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          },
          {
            "name": "pressureCWater",
            "type": "Process"
          }
        ],
        "runEmpty": [
          {
            "name": "addProcessTime",
            "type": "Process"
          },
          {
            "name": "quantity",
            "type": "Material"
          }
        ]
      }
    },
    "sPremix": {
      "units": [],
      "phases": {
        "mixerOff": [],
        "mixerOn": [
          {
            "name": "setpointLevelMin",
            "type": "Process"
          },
          {
            "name": "setpointLevelMax",
            "type": "Process"
          }
        ],
        "setTempLimit": [
          {
            "name": "temperatureHH",
            "type": "Process"
          },
          {
            "name": "temperatureH",
            "type": "Process"
          },
          {
            "name": "temperatureL",
            "type": "Process"
          }
        ],
        "psiMixModeA": [
          {
            "name": "speedRotor",
            "type": "Process"
          },
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "speedRotaryValve",
            "type": "Process"
          },
          {
            "name": "addProcessTime",
            "type": "Process"
          },
          {
            "name": "pressChamber",
            "type": "Process"
          },
          {
            "name": "levelHopperHigh",
            "type": "Process"
          },
          {
            "name": "levelHopperLow",
            "type": "Process"
          }
        ],
        "psiMixModeB": [
          {
            "name": "speedRotor",
            "type": "Process"
          },
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "processTime",
            "type": "Process"
          },
          {
            "name": "pressChamber",
            "type": "Process"
          }
        ],
        "psiMixModeBFlPsi": [
          {
            "name": "speedRotor",
            "type": "Process"
          },
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "pressChamber",
            "type": "Process"
          },
          {
            "name": "airBlowTime",
            "type": "Process"
          },
          {
            "name": "pressureCWater",
            "type": "Process"
          }
        ],
        "coolingOn3811": [
          {
            "name": "setpointTemp",
            "type": "Process"
          }
        ],
        "coolingOff3811": [],
        "feedCipWater3811": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "pressureCWater",
            "type": "Process"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          },
          {
            "name": "valve1st",
            "type": "Process"
          },
          {
            "name": "valve2nd",
            "type": "Process"
          },
          {
            "name": "valve4th",
            "type": "Process"
          },
          {
            "name": "ratio2nd",
            "type": "Process"
          },
          {
            "name": "valve3rd",
            "type": "Process"
          },
          {
            "name": "ratio3rd",
            "type": "Process"
          },
          {
            "name": "ratio4th",
            "type": "Process"
          },
          {
            "name": "cycles",
            "type": "Process"
          }
        ],
        "circulateMill": [
          {
            "name": "speedMill",
            "type": "Process"
          },
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "addProcessTime",
            "type": "Process"
          }
        ],
        "feedGlycolTo3811": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          }
        ],
        "psiMixModeAMill": [
          {
            "name": "pressChamber",
            "type": "Process"
          },
          {
            "name": "speedRotor",
            "type": "Process"
          },
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "speedRotaryValve",
            "type": "Process"
          },
          {
            "name": "levelHopperHigh",
            "type": "Process"
          },
          {
            "name": "levelHopperLow",
            "type": "Process"
          },
          {
            "name": "addProcessTime",
            "type": "Process"
          },
          {
            "name": "speedMill",
            "type": "Process"
          }
        ],
        "psiMixModeBMill": [
          {
            "name": "pressChamber",
            "type": "Process"
          },
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "speedRotor",
            "type": "Process"
          },
          {
            "name": "addProcessTime",
            "type": "Process"
          },
          {
            "name": "speedMill",
            "type": "Process"
          }
        ],
        "feedPrcWater3811": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          },
          {
            "name": "selectValve",
            "type": "Process"
          }
        ],
        "drainFryma3811": [],
        "drainFryma4211": [],
        "drain3811Mill": [],
        "drain3811Premix": [],
        "drainPSI3811": [],
        "drainPSIout3511": [],
        "drainPSImixTorn": [],
        "drainHopper3511": [],
        "drainFrymaIn": [],
        "drainPSItoFryma": [],
        "drainPSIinTorn": [],
        "feedPowder3114": [
          {
            "name": "Input",
            "type": "Material"
          }
        ],
        "feedPowder3115": [
          {
            "name": "Input",
            "type": "Material"
          }
        ],
        "psiMixModeAF3114": [
          {
            "name": "speedRotor",
            "type": "Process"
          },
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "speedRotaryValve",
            "type": "Process"
          },
          {
            "name": "pressChamber",
            "type": "Process"
          },
          {
            "name": "levelHopperHigh",
            "type": "Process"
          },
          {
            "name": "levelHopperLow",
            "type": "Process"
          },
          {
            "name": "levHopperFilHigh",
            "type": "Process"
          },
          {
            "name": "levHopperFilLow",
            "type": "Process"
          },
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "pressureCWater",
            "type": "Process"
          },
          {
            "name": "valve1st",
            "type": "Process"
          },
          {
            "name": "valve2nd",
            "type": "Process"
          },
          {
            "name": "valve3rd",
            "type": "Process"
          },
          {
            "name": "valve4th",
            "type": "Process"
          },
          {
            "name": "ratio2nd",
            "type": "Process"
          },
          {
            "name": "ratio3rd",
            "type": "Process"
          },
          {
            "name": "ratio4th",
            "type": "Process"
          },
          {
            "name": "cycles",
            "type": "Process"
          },
          {
            "name": "speedRotor",
            "type": "Process"
          },
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "speedRotaryValve",
            "type": "Process"
          },
          {
            "name": "pressChamber",
            "type": "Process"
          },
          {
            "name": "levelHopperHigh",
            "type": "Process"
          },
          {
            "name": "levelHopperLow",
            "type": "Process"
          },
          {
            "name": "levHopperFilHigh",
            "type": "Process"
          },
          {
            "name": "levHopperFilLow",
            "type": "Process"
          },
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "pressureCWater",
            "type": "Process"
          },
          {
            "name": "valve1st",
            "type": "Process"
          },
          {
            "name": "valve2nd",
            "type": "Process"
          },
          {
            "name": "valve3rd",
            "type": "Process"
          },
          {
            "name": "valve4th",
            "type": "Process"
          },
          {
            "name": "valve5th",
            "type": "Process"
          },
          {
            "name": "ratio2nd",
            "type": "Process"
          },
          {
            "name": "ratio3rd",
            "type": "Process"
          },
          {
            "name": "ratio4th",
            "type": "Process"
          },
          {
            "name": "ratio5th",
            "type": "Process"
          },
          {
            "name": "cycles",
            "type": "Process"
          }
        ],
        "feed3114To3112": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "startQuantity",
            "type": "Process"
          },
          {
            "name": "levHopperFilHigh",
            "type": "Process"
          },
          {
            "name": "levHopperFilLow",
            "type": "Process"
          }
        ],
        "feed3115To3112": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feed": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          }
        ],
        "flushCipWtr": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          },
          {
            "name": "pressureCWater",
            "type": "Process"
          }
        ],
        "flushGlycol": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          }
        ],
        "flushProcessWtr": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          }
        ],
        "runEmpty": [
          {
            "name": "addProcessTime",
            "type": "Process"
          },
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feed3341To3811": [
          {
            "name": "quantityProduct",
            "type": "Material"
          },
          {
            "name": "quantityCip",
            "type": "Material"
          },
          {
            "name": "cycles",
            "type": "Process"
          },
          {
            "name": "pressureCWater",
            "type": "Process"
          }
        ],
        "feed3361To3811": [
          {
            "name": "quantityProduct",
            "type": "Material"
          },
          {
            "name": "quantityCip",
            "type": "Material"
          },
          {
            "name": "cycles",
            "type": "Process"
          },
          {
            "name": "pressureCWater",
            "type": "Process"
          }
        ],
        "flush3361To3811": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "pressureCWater",
            "type": "Process"
          },
          {
            "name": "selectValve",
            "type": "Process"
          }
        ],
        "feedPregelTo3811": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          },
          {
            "name": "speedPump",
            "type": "Process"
          }
        ]
      }
    },
    "mMillBase": {
      "units": [
        "mU4211MillBase"
      ],
      "phases": {
        "coolingOn": [
          {
            "name": "setpointTemp",
            "type": "Process"
          }
        ],
        "coolingOff": [],
        "mixerOn": [
          {
            "name": "setpointLevelMin",
            "type": "Process"
          },
          {
            "name": "setpointLevelMax",
            "type": "Process"
          }
        ],
        "feedProcWaterSB": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feedCleanWater": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "mixerOff": [],
        "setTempLimit": [
          {
            "name": "temperatureHH",
            "type": "Process"
          },
          {
            "name": "temperatureH",
            "type": "Process"
          },
          {
            "name": "temperatureL",
            "type": "Process"
          }
        ],
        "feedCleanWaterSB": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feedProcWaterSpN": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "milling": [
          {
            "name": "speedMill",
            "type": "Process"
          },
          {
            "name": "speedPump",
            "type": "Process"
          }
        ],
        "transfer": [
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feed": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "speedPump",
            "type": "Process"
          }
        ]
      }
    },
    "mSmallAdditions": {
      "units": [
        "mU3341SmallAdd"
      ],
      "phases": {
        "feed3341To3811FW": [
          {
            "name": "quantityProcWat",
            "type": "Process"
          }
        ],
        "feed3341To3811": [
          {
            "name": "quantityProduct",
            "type": "Material"
          },
          {
            "name": "quantityCleanWat",
            "type": "Process"
          },
          {
            "name": "cycles",
            "type": "Process"
          }
        ],
        "feed3341To5111": [
          {
            "name": "quantityProduct",
            "type": "Material"
          },
          {
            "name": "quantityCleanWat",
            "type": "Process"
          },
          {
            "name": "cycles",
            "type": "Process"
          }
        ],
        "feed3341To5111FW": [
          {
            "name": "quantityProcWat",
            "type": "Process"
          }
        ]
      }
    },
    "mFormulationHold": {
      "units": [
        "mU5112Formulatio"
      ],
      "phases": {
        "setTempLimit": [
          {
            "name": "temperatureHH",
            "type": "Process"
          },
          {
            "name": "temperatureH",
            "type": "Process"
          },
          {
            "name": "temperatureL",
            "type": "Process"
          }
        ],
        "mixerOn": [
          {
            "name": "setpointLevelMin",
            "type": "Process"
          },
          {
            "name": "setpointLevelMax",
            "type": "Process"
          }
        ],
        "mixerOff": [],
        "feedCleanWater": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feedProcWaterSB": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "circulatePump": [
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "time",
            "type": "Process"
          }
        ],
        "feedCleanWaterSB": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feedProcWaterSpN": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "transfer": [
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "refill": [
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "levelMin",
            "type": "Process"
          },
          {
            "name": "levelMax",
            "type": "Process"
          },
          {
            "name": "quantity",
            "type": "Material"
          }
        ]
      }
    },
    "sPremixSA": {
      "units": [
        "sUPremixSA3361"
      ],
      "phases": {}
    },
    "sFormulationSA": {
      "units": [
        "sUFormSA3351"
      ],
      "phases": {}
    },
    "sWP2": {
      "units": [
        "sUwp2_3331"
      ],
      "phases": {}
    },
    "sPregel": {
      "units": [
        "sUPregel3222",
        "sUPregel3221"
      ],
      "phases": {
        "mixerOn": [
          {
            "name": "setpointLevelMin",
            "type": "Process"
          },
          {
            "name": "setpointLevelMax",
            "type": "Process"
          }
        ],
        "mixerOff": [],
        "setTempLimit": [
          {
            "name": "temperatureHH",
            "type": "Process"
          },
          {
            "name": "temperatureH",
            "type": "Process"
          },
          {
            "name": "temperatureL",
            "type": "Process"
          }
        ],
        "feedCipWater": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "pressureCWater",
            "type": "Process"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          },
          {
            "name": "valve1st",
            "type": "Process"
          },
          {
            "name": "valve2nd",
            "type": "Process"
          },
          {
            "name": "valve3rd",
            "type": "Process"
          },
          {
            "name": "valve4th",
            "type": "Process"
          },
          {
            "name": "ratio2nd",
            "type": "Process"
          },
          {
            "name": "ratio3nd",
            "type": "Process"
          },
          {
            "name": "ratio4th",
            "type": "Process"
          },
          {
            "name": "cycles",
            "type": "Process"
          }
        ],
        "feedPrcWater": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          },
          {
            "name": "selectValve",
            "type": "Process"
          }
        ],
        "feedPowder": [
          {
            "name": "speed",
            "type": "Process"
          },
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "recirculate": [
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          },
          {
            "name": "time",
            "type": "Process"
          }
        ],
        "drainBeforeP_T_P": [],
        "drain322xto3811": [],
        "drain322xto5111": [],
        "drain322xto5121": [],
        "feed3341ToPregel": [
          {
            "name": "quantityProduct",
            "type": "Material"
          },
          {
            "name": "quantityCip",
            "type": "Material"
          },
          {
            "name": "cycles",
            "type": "Process"
          },
          {
            "name": "pressureCWater",
            "type": "Process"
          }
        ]
      }
    },
    "sHolding": {
      "units": [
        "sUHolding5111",
        "sUHolding5121"
      ],
      "phases": {
        "feedCipWater": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "pressureCWater",
            "type": "Process"
          },
          {
            "name": "valve1st",
            "type": "Process"
          },
          {
            "name": "valve2nd",
            "type": "Process"
          },
          {
            "name": "valve3rd",
            "type": "Process"
          },
          {
            "name": "valve4th",
            "type": "Process"
          },
          {
            "name": "valve5th",
            "type": "Process"
          },
          {
            "name": "ratio2nd",
            "type": "Process"
          },
          {
            "name": "ratio3rd",
            "type": "Process"
          },
          {
            "name": "ratio4th",
            "type": "Process"
          },
          {
            "name": "ratio5th",
            "type": "Process"
          },
          {
            "name": "cycles",
            "type": "Process"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          },
          {
            "name": "selectMode",
            "type": "Process"
          }
        ],
        "setTempLimit": [
          {
            "name": "temperatureHH",
            "type": "Process"
          },
          {
            "name": "temperatureH",
            "type": "Process"
          },
          {
            "name": "temperatureL",
            "type": "Process"
          }
        ],
        "transToFillSt": [
          {
            "name": "fillRoute",
            "type": "Process"
          },
          {
            "name": "fillLine",
            "type": "Process"
          },
          {
            "name": "quantity",
            "type": "Recipe"
          }
        ],
        "mixerOff": [],
        "mixerOn": [
          {
            "name": "setpointLevelMin",
            "type": "Process"
          },
          {
            "name": "setpointLevelMax",
            "type": "Process"
          }
        ],
        "circulatePump": [
          {
            "name": "time",
            "type": "Process"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          }
        ]
      }
    },
    "mMilling": {
      "units": [
        "mU3812Milling"
      ],
      "phases": {
        "coolingOn": [
          {
            "name": "setpointTemp",
            "type": "Process"
          }
        ],
        "coolingOff": [],
        "feedCleanWater": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feedProcWaterSB": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "mixerOn": [
          {
            "name": "setpointLevelMin",
            "type": "Process"
          },
          {
            "name": "setpointLevelMax",
            "type": "Process"
          }
        ],
        "mixerOff": [],
        "millingCycling": [
          {
            "name": "time",
            "type": "Process"
          },
          {
            "name": "speedMill",
            "type": "Process"
          },
          {
            "name": "speedPump",
            "type": "Process"
          }
        ],
        "millingCycFlush": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "speedMill",
            "type": "Process"
          },
          {
            "name": "speedPump",
            "type": "Process"
          }
        ],
        "setTempLimit": [
          {
            "name": "temperatureHH",
            "type": "Process"
          },
          {
            "name": "temperatureH",
            "type": "Process"
          },
          {
            "name": "temperatureL",
            "type": "Process"
          }
        ],
        "feedCleanWaterSB": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feedProcWaterSpN": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "transfer": [
          {
            "name": "speedPump",
            "type": "Process"
          }
        ],
        "transferFlush": [
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "transferFryma": [
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "speedMill",
            "type": "Process"
          }
        ]
      }
    },
    "mFillingLine": {
      "units": [
        "mUFillingLine"
      ],
      "phases": {}
    },
    "mPremix": {
      "units": [],
      "phases": {
        "mixerOn": [
          {
            "name": "setpointLevelMin",
            "type": "Process"
          },
          {
            "name": "setpointLevelMax",
            "type": "Process"
          }
        ],
        "mixerOff": [],
        "feedProcWater": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feedCleanWater": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feedProcWaterSB": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "coolingOn": [
          {
            "name": "setpointTemp",
            "type": "Process"
          }
        ],
        "coolingOff": [],
        "setTempLimit": [
          {
            "name": "temperatureHH",
            "type": "Process"
          },
          {
            "name": "temperatureH",
            "type": "Process"
          },
          {
            "name": "temperatureL",
            "type": "Process"
          }
        ],
        "psiMixModeA": [
          {
            "name": "speedRotor",
            "type": "Process"
          },
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "speedRotaryValve",
            "type": "Process"
          },
          {
            "name": "addProcessTime",
            "type": "Process"
          },
          {
            "name": "pressVacCav",
            "type": "Process"
          }
        ],
        "psiMixModeB": [
          {
            "name": "speedRotor",
            "type": "Process"
          },
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "processTime",
            "type": "Process"
          },
          {
            "name": "pressVacCav",
            "type": "Process"
          }
        ],
        "psiMixModeBFlPip": [
          {
            "name": "speedRotor",
            "type": "Process"
          },
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "pressVacCav",
            "type": "Process"
          },
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "psiMixModeBFlPsi": [
          {
            "name": "speedRotor",
            "type": "Process"
          },
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "pressVacCav",
            "type": "Process"
          },
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feedCleanWaterSB": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feedAddition3221": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "circFryma": [
          {
            "name": "time",
            "type": "Process"
          },
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "speedMill",
            "type": "Process"
          }
        ],
        "heatingOn3221": [],
        "heatingOff3221": [],
        "feedProcWaterSpN": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feed3115to3112": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "speedRotor",
            "type": "Process"
          },
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "speedRotaryValve",
            "type": "Process"
          },
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "pressVacCav",
            "type": "Process"
          },
          {
            "name": "valve1st",
            "type": "Process"
          },
          {
            "name": "valve2nd",
            "type": "Process"
          },
          {
            "name": "valve3rd",
            "type": "Process"
          },
          {
            "name": "valve4th",
            "type": "Process"
          },
          {
            "name": "valve5th",
            "type": "Process"
          },
          {
            "name": "ratio2nd",
            "type": "Process"
          },
          {
            "name": "ratio3rd",
            "type": "Process"
          },
          {
            "name": "ratio4th",
            "type": "Process"
          },
          {
            "name": "ratio5th",
            "type": "Process"
          },
          {
            "name": "cycles",
            "type": "Process"
          }
        ]
      }
    },
    "sWaste": {
      "units": [
        "sUWaste5131"
      ],
      "phases": {
        "circulatePump": [
          {
            "name": "time",
            "type": "Process"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          }
        ],
        "feedCipWater": [
          {
            "name": "quantity",
            "type": "Material"
          },
          {
            "name": "pressureCWater",
            "type": "Process"
          },
          {
            "name": "setpointMixer",
            "type": "Process"
          }
        ],
        "mixerOff": [],
        "mixerOn": [
          {
            "name": "setpointLevelMin",
            "type": "Process"
          },
          {
            "name": "setpointLevelMax",
            "type": "Process"
          }
        ],
        "setTempLimit": [
          {
            "name": "temperatureHH",
            "type": "Process"
          },
          {
            "name": "temperatureH",
            "type": "Process"
          },
          {
            "name": "temperatureL",
            "type": "Process"
          }
        ],
        "transToWasteSt": [
          {
            "name": "quantity",
            "type": "Recipe"
          }
        ]
      }
    },
    "sPreservativeSA": {
      "units": [
        "sUPreservtSA3341"
      ],
      "phases": {}
    },
    "mFormulation": {
      "units": [
        "mU5111Formulatio"
      ],
      "phases": {
        "setTempLimit": [
          {
            "name": "temperatureHH",
            "type": "Process"
          },
          {
            "name": "temperatureH",
            "type": "Process"
          },
          {
            "name": "temperatureL",
            "type": "Process"
          }
        ],
        "coolingOn": [
          {
            "name": "setpointTemp",
            "type": "Process"
          }
        ],
        "coolingOff": [],
        "dissolverOn": [
          {
            "name": "speed",
            "type": "Process"
          }
        ],
        "dissolverOff": [],
        "disperging": [
          {
            "name": "time",
            "type": "Process"
          },
          {
            "name": "speedDissolver",
            "type": "Process"
          }
        ],
        "feedCleanWater": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feedProcWater": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feedProcWaterSB": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "circulatePump": [
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "time",
            "type": "Process"
          }
        ],
        "heatingOn3222": [],
        "heatingOff3222": [],
        "mixerOn": [
          {
            "name": "setpointLevelMin",
            "type": "Process"
          },
          {
            "name": "setpointLevelMax",
            "type": "Process"
          }
        ],
        "mixerOff": [],
        "circulatePumpPh": [
          {
            "name": "speedPump",
            "type": "Process"
          },
          {
            "name": "time",
            "type": "Process"
          },
          {
            "name": "limitPhHi",
            "type": "Process"
          },
          {
            "name": "limitPhLow",
            "type": "Process"
          }
        ],
        "feedAdditon3222": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feedPowder5111": [
          {
            "name": "speedDissolver",
            "type": "Process"
          },
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feedCleanWaterSB": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ],
        "feedProcWaterSpN": [
          {
            "name": "quantity",
            "type": "Material"
          }
        ]
      }
    }
  },
  "connections": [
    {
      "name": "sC3811_5121",
      "source": "sUPremix",
      "dest": "sUForm5121"
    },
    {
      "name": "sC3811_5111",
      "source": "sUPremix",
      "dest": "sUForm5111"
    },
    {
      "name": "sC3221_3811",
      "source": "sUPregel3221",
      "dest": "sUPremix"
    },
    {
      "name": "mC3341_5111",
      "source": "mU3341SmallAdd",
      "dest": "mU5111Formulatio"
    },
    {
      "name": "mC3341_3811",
      "source": "mU3341SmallAdd",
      "dest": "mU3811Premix"
    },
    {
      "name": "mC3341_3322",
      "source": "mU3341SmallAdd",
      "dest": "mU3322Pregel"
    },
    {
      "name": "mC3341_3321",
      "source": "mU3341SmallAdd",
      "dest": "mU3321Pregel"
    },
    {
      "name": "sC3221_5111",
      "source": "sUPregel3221",
      "dest": "sUForm5111"
    },
    {
      "name": "mC5112_07_5131",
      "source": "mU5112Formulatio",
      "dest": "sUWaste5131"
    },
    {
      "name": "mC3322_5111",
      "source": "mU3322Pregel",
      "dest": "mU5111Formulatio"
    },
    {
      "name": "sC3222_5111",
      "source": "sUPregel3222",
      "dest": "sUForm5111"
    },
    {
      "name": "sC3321_3811",
      "source": "sUwp1_3321",
      "dest": "sUPremix"
    },
    {
      "name": "sC3351_5111",
      "source": "sUFormSA3351",
      "dest": "sUForm5111"
    },
    {
      "name": "sC3811_4211",
      "source": "sUPremix",
      "dest": "sUMilling"
    },
    {
      "name": "sC5121_07_5131",
      "source": "sUForm5121",
      "dest": "sUWaste5131"
    },
    {
      "name": "sC5121_07_5121",
      "source": "sUForm5121",
      "dest": "sUHolding5121"
    },
    {
      "name": "mC5112_07_5111",
      "source": "mU5112Formulatio",
      "dest": "sUHolding5111"
    },
    {
      "name": "mC5112_07_5121",
      "source": "mU5112Formulatio",
      "dest": "sUHolding5121"
    },
    {
      "name": "mC5111_5112",
      "source": "mU5111Formulatio",
      "dest": "mU5112Formulatio"
    },
    {
      "name": "sC3321_5121",
      "source": "sUwp1_3321",
      "dest": "sUForm5121"
    },
    {
      "name": "sC3331_5111",
      "source": "sUwp2_3331",
      "dest": "sUForm5111"
    },
    {
      "name": "mC4212_5111",
      "source": "mU4211MillBase",
      "dest": "mU5111Formulatio"
    },
    {
      "name": "mC3812_4211",
      "source": "mU3812Milling",
      "dest": "mU4211MillBase"
    },
    {
      "name": "mC3811_3812",
      "source": "mU3811Premix",
      "dest": "mU3812Milling"
    },
    {
      "name": "sC3222_5121",
      "source": "sUPregel3222",
      "dest": "sUForm5121"
    },
    {
      "name": "sC3341_3221",
      "source": "sUPreservtSA3341",
      "dest": "sUPregel3221"
    },
    {
      "name": "sC3341_5211",
      "source": "sUPreservtSA3341",
      "dest": "sUForm5121"
    },
    {
      "name": "sC3341_5111",
      "source": "sUPreservtSA3341",
      "dest": "sUForm5111"
    },
    {
      "name": "sC3361_3811",
      "source": "sUPremixSA3361",
      "dest": "sUPremix"
    },
    {
      "name": "sC3341_3222",
      "source": "sUPreservtSA3341",
      "dest": "sUPregel3222"
    },
    {
      "name": "sC5111_07_5121",
      "source": "sUForm5111",
      "dest": "sUHolding5121"
    },
    {
      "name": "sC5111_07_5131",
      "source": "sUForm5111",
      "dest": "sUWaste5131"
    },
    {
      "name": "mC5112_Filling",
      "source": "mU5112Formulatio",
      "dest": "mUFillingLine"
    },
    {
      "name": "sC3331_3811",
      "source": "sUwp2_3331",
      "dest": "sUPremix"
    },
    {
      "name": "sC3321_5111",
      "source": "sUwp1_3321",
      "dest": "sUForm5111"
    },
    {
      "name": "sC3331_5121",
      "source": "sUwp2_3331",
      "dest": "sUForm5121"
    },
    {
      "name": "mC3322_3811",
      "source": "mU3322Pregel",
      "dest": "mU3811Premix"
    },
    {
      "name": "sC4211_5121",
      "source": "sUMilling",
      "dest": "sUForm5121"
    },
    {
      "name": "sC3222_3811",
      "source": "sUPregel3222",
      "dest": "sUPremix"
    },
    {
      "name": "sC3341_3811",
      "source": "sUPreservtSA3341",
      "dest": "sUPremix"
    },
    {
      "name": "sC3351_5211",
      "source": "sUFormSA3351",
      "dest": "sUForm5121"
    },
    {
      "name": "sC4211_5111",
      "source": "sUMilling",
      "dest": "sUForm5111"
    },
    {
      "name": "sC3221_5121",
      "source": "sUPregel3221",
      "dest": "sUForm5121"
    },
    {
      "name": "sC5121_07_5111",
      "source": "sUForm5121",
      "dest": "sUHolding5111"
    },
    {
      "name": "sC5111_07_5111",
      "source": "sUForm5111",
      "dest": "sUHolding5111"
    },
    {
      "name": "mC4211_3812",
      "source": "mU4211MillBase",
      "dest": "mU3812Milling"
    }
  ],
  "transfers": [
    {
      "name": "sMillToFormul",
      "source": "sMilling",
      "dest": "sFormulation"
    },
    {
      "name": "sPremixToFormul",
      "source": "sPremix",
      "dest": "sFormulation"
    },
    {
      "name": "sWP1ToFormul",
      "source": "sWP1",
      "dest": "sFormulation"
    },
    {
      "name": "sWP2ToFormul",
      "source": "sWP2",
      "dest": "sFormulation"
    },
    {
      "name": "sPreserSaToForm",
      "source": "sPreservativeSA",
      "dest": "sFormulation"
    },
    {
      "name": "sFormulSaToForm",
      "source": "sFormulationSA",
      "dest": "sFormulation"
    },
    {
      "name": "sPregelToFormul",
      "source": "sPregel",
      "dest": "sFormulation"
    },
    {
      "name": "sFormulToHolding",
      "source": "sFormulation",
      "dest": "sHolding"
    },
    {
      "name": "sFormulToWaste",
      "source": "sFormulation",
      "dest": "sWaste"
    },
    {
      "name": "mTSmAddToPregel1",
      "source": "mSmallAdditions",
      "dest": "mPregel1"
    },
    {
      "name": "mTSmAddToPregel2",
      "source": "mSmallAdditions",
      "dest": "mPregel2"
    },
    {
      "name": "mTPrege2ToPremix",
      "source": "mPregel2",
      "dest": "mPremix"
    },
    {
      "name": "mTPrege2ToForm",
      "source": "mPregel2",
      "dest": "mFormulation"
    },
    {
      "name": "sPremixToMill",
      "source": "sPremix",
      "dest": "sMilling"
    },
    {
      "name": "sWP1ToPremix",
      "source": "sWP1",
      "dest": "sPremix"
    },
    {
      "name": "sWP2ToPremix",
      "source": "sWP2",
      "dest": "sPremix"
    },
    {
      "name": "sPreserSaToPremx",
      "source": "sPreservativeSA",
      "dest": "sPremix"
    },
    {
      "name": "sPremixSaToPremx",
      "source": "sPremixSA",
      "dest": "sPremix"
    },
    {
      "name": "sPregelToPremix",
      "source": "sPregel",
      "dest": "sPremix"
    },
    {
      "name": "mTmill",
      "source": "mMilling",
      "dest": "mMillBase"
    },
    {
      "name": "mTmillBToPremH",
      "source": "mMillBase",
      "dest": "mMilling"
    },
    {
      "name": "mTmillBasToForm",
      "source": "mMillBase",
      "dest": "mFormulation"
    },
    {
      "name": "mTSmAddToPremix",
      "source": "mSmallAdditions",
      "dest": "mPremix"
    },
    {
      "name": "mTSmAddToFormul",
      "source": "mSmallAdditions",
      "dest": "mFormulation"
    },
    {
      "name": "mTFormuToHolding",
      "source": "mFormulation",
      "dest": "mFormulationHold"
    },
    {
      "name": "mTFormHoldToHold",
      "source": "mFormulationHold",
      "dest": "sHolding"
    },
    {
      "name": "mTFormHoldToWast",
      "source": "mFormulationHold",
      "dest": "sWaste"
    },
    {
      "name": "mTFormHoToFillin",
      "source": "mFormulationHold",
      "dest": "mFillingLine"
    },
    {
      "name": "sPreserSaToPregl",
      "source": "sPreservativeSA",
      "dest": "sPregel"
    },
    {
      "name": "mTPremToPremH",
      "source": "mPremix",
      "dest": "mMilling"
    }
  ],
  "transfer_phases": {
    "sMillToFormul": {
      "transfer": [
        {
          "name": "speedPump",
          "type": "Transfer"
        },
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "transferOrDosing",
          "type": "Transfer"
        }
      ],
      "millingPassage": [
        {
          "name": "speedPump",
          "type": "Transfer"
        },
        {
          "name": "setpTemperature",
          "type": "Transfer"
        },
        {
          "name": "speedMill",
          "type": "Transfer"
        },
        {
          "name": "setpPressure",
          "type": "Transfer"
        },
        {
          "name": "tempCtrlOn",
          "type": "Transfer"
        },
        {
          "name": "pressCtrlOn",
          "type": "Transfer"
        },
        {
          "name": "quantity",
          "type": "Transfer"
        }
      ]
    },
    "sPremixToFormul": {
      "millingPassage": [
        {
          "name": "speedPump",
          "type": "Transfer"
        },
        {
          "name": "setpTemperature",
          "type": "Transfer"
        },
        {
          "name": "speedMill",
          "type": "Transfer"
        },
        {
          "name": "setpPressure",
          "type": "Transfer"
        },
        {
          "name": "tempCtrlOn",
          "type": "Transfer"
        },
        {
          "name": "pressCtrlOn",
          "type": "Transfer"
        }
      ],
      "transfer": [
        {
          "name": "speedPump",
          "type": "Transfer"
        },
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "transferOrDosing",
          "type": "Transfer"
        }
      ]
    },
    "sWP1ToFormul": {
      "feed": [
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "setpointMixer",
          "type": "Transfer"
        }
      ],
      "flushGlycol": [
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "setpointMixer",
          "type": "Transfer"
        }
      ],
      "flushProcessWtr": [
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "setpointMixer",
          "type": "Transfer"
        }
      ],
      "flushCipWtr": [
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "setpointMixer",
          "type": "Transfer"
        },
        {
          "name": "pressureCWater",
          "type": "Transfer"
        }
      ],
      "runEmpty": [
        {
          "name": "addProcessTime",
          "type": "Transfer"
        },
        {
          "name": "quantity",
          "type": "Transfer"
        }
      ]
    },
    "sWP2ToFormul": {
      "feed": [
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "setpointMixer",
          "type": "Transfer"
        }
      ],
      "flushCipWtr": [
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "setpointMixer",
          "type": "Transfer"
        },
        {
          "name": "pressureCWater",
          "type": "Transfer"
        }
      ],
      "flushGlycol": [
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "setpointMixer",
          "type": "Transfer"
        }
      ],
      "flushProcessWtr": [
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "setpointMixer",
          "type": "Transfer"
        }
      ],
      "runEmpty": [
        {
          "name": "addProcessTime",
          "type": "Transfer"
        },
        {
          "name": "quantity",
          "type": "Transfer"
        }
      ]
    },
    "sPreserSaToForm": {
      "feed3341ToFormul": [
        {
          "name": "quantityProduct",
          "type": "Transfer"
        },
        {
          "name": "quantityCip",
          "type": "Transfer"
        },
        {
          "name": "cycles",
          "type": "Transfer"
        },
        {
          "name": "pressureCWater",
          "type": "Transfer"
        }
      ]
    },
    "sFormulSaToForm": {
      "feed3351ToFormu": [
        {
          "name": "quantityProduct",
          "type": "Transfer"
        },
        {
          "name": "quantityCip",
          "type": "Transfer"
        },
        {
          "name": "cycles",
          "type": "Transfer"
        },
        {
          "name": "pressureCWater",
          "type": "Transfer"
        }
      ],
      "flush3351ToFormu": [
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "pressureCWater",
          "type": "Transfer"
        },
        {
          "name": "selectValve",
          "type": "Transfer"
        }
      ]
    },
    "sPregelToFormul": {
      "feedPregel": [
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "setpointMixer",
          "type": "Transfer"
        },
        {
          "name": "speedPump",
          "type": "Transfer"
        }
      ]
    },
    "sFormulToHolding": {
      "transfer": [
        {
          "name": "speedPump",
          "type": "Transfer"
        },
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "transferOrDosing",
          "type": "Transfer"
        }
      ]
    },
    "sFormulToWaste": {
      "transfer": [
        {
          "name": "speedPump",
          "type": "Transfer"
        },
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "transferOrDosing",
          "type": "Transfer"
        }
      ]
    },
    "mTSmAddToPregel1": {
      "feed3341To3321FW": [
        {
          "name": "quantityProcWat",
          "type": "Transfer"
        }
      ],
      "feed3341To3321": [
        {
          "name": "quantityProduct",
          "type": "Transfer"
        },
        {
          "name": "quantityCleanWat",
          "type": "Transfer"
        },
        {
          "name": "cycles",
          "type": "Transfer"
        }
      ]
    },
    "mTSmAddToPregel2": {
      "feed3341To3322FW": [
        {
          "name": "quantityProcWat",
          "type": "Transfer"
        }
      ],
      "feed3341To3322": [
        {
          "name": "quantityProduct",
          "type": "Transfer"
        },
        {
          "name": "quantityCleanWat",
          "type": "Transfer"
        },
        {
          "name": "cycles",
          "type": "Transfer"
        }
      ]
    },
    "mTPrege2ToPremix": {
      "feedPreg2ToPrem": [
        {
          "name": "speedPump",
          "type": "Transfer"
        },
        {
          "name": "quantity",
          "type": "Transfer"
        }
      ]
    },
    "mTPrege2ToForm": {
      "feedPreg2ToForm": [
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "speedPump",
          "type": "Transfer"
        }
      ]
    },
    "sPremixToMill": {
      "tran3811To4211NP": [
        {
          "name": "speedPump",
          "type": "Transfer"
        },
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "transferOrDosing",
          "type": "Transfer"
        }
      ],
      "millingPassage": [
        {
          "name": "speedPump",
          "type": "Transfer"
        },
        {
          "name": "setpTemperature",
          "type": "Transfer"
        },
        {
          "name": "speedMill",
          "type": "Transfer"
        },
        {
          "name": "setpPressure",
          "type": "Transfer"
        },
        {
          "name": "tempCtrlOn",
          "type": "Transfer"
        },
        {
          "name": "pressCtrlOn",
          "type": "Transfer"
        }
      ],
      "tran3811To4211FR": [
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "transferOrDosing",
          "type": "Transfer"
        },
        {
          "name": "speedMill",
          "type": "Transfer"
        },
        {
          "name": "speedPump",
          "type": "Transfer"
        }
      ],
      "tran3811To4211PM": [
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "transferOrDosing",
          "type": "Transfer"
        },
        {
          "name": "chamberPress",
          "type": "Transfer"
        },
        {
          "name": "speedPump",
          "type": "Transfer"
        },
        {
          "name": "speedRotor",
          "type": "Transfer"
        }
      ]
    },
    "sWP1ToPremix": {
      "feed": [
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "setpointMixer",
          "type": "Transfer"
        }
      ],
      "flushGlycol": [
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "setpointMixer",
          "type": "Transfer"
        }
      ],
      "flushProcessWtr": [
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "setpointMixer",
          "type": "Transfer"
        }
      ],
      "flushCipWtr": [
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "setpointMixer",
          "type": "Transfer"
        },
        {
          "name": "pressureCWater",
          "type": "Transfer"
        }
      ],
      "runEmpty": [
        {
          "name": "addProcessTime",
          "type": "Transfer"
        },
        {
          "name": "quantity",
          "type": "Transfer"
        }
      ]
    },
    "sWP2ToPremix": {
      "feed": [
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "setpointMixer",
          "type": "Transfer"
        }
      ],
      "flushCipWtr": [
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "setpointMixer",
          "type": "Transfer"
        },
        {
          "name": "pressureCWater",
          "type": "Transfer"
        }
      ],
      "flushGlycol": [
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "setpointMixer",
          "type": "Transfer"
        }
      ],
      "flushProcessWtr": [
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "setpointMixer",
          "type": "Transfer"
        }
      ],
      "runEmpty": [
        {
          "name": "addProcessTime",
          "type": "Transfer"
        },
        {
          "name": "quantity",
          "type": "Transfer"
        }
      ]
    },
    "sPreserSaToPremx": {
      "feed3341To3811": [
        {
          "name": "quantityProduct",
          "type": "Transfer"
        },
        {
          "name": "quantityCip",
          "type": "Transfer"
        },
        {
          "name": "cycles",
          "type": "Transfer"
        },
        {
          "name": "pressureCWater",
          "type": "Transfer"
        }
      ]
    },
    "sPremixSaToPremx": {
      "feed3361To3811": [
        {
          "name": "quantityProduct",
          "type": "Transfer"
        },
        {
          "name": "quantityCip",
          "type": "Transfer"
        },
        {
          "name": "cycles",
          "type": "Transfer"
        },
        {
          "name": "pressureCWater",
          "type": "Transfer"
        }
      ],
      "flush3361To3811": [
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "pressureCWater",
          "type": "Transfer"
        },
        {
          "name": "selectValve",
          "type": "Transfer"
        }
      ]
    },
    "sPregelToPremix": {
      "feedPregelTo3811": [
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "setpointMixer",
          "type": "Transfer"
        },
        {
          "name": "speedPump",
          "type": "Transfer"
        }
      ]
    },
    "mTmill": {
      "milling": [
        {
          "name": "speedMill",
          "type": "Transfer"
        },
        {
          "name": "speedPump",
          "type": "Transfer"
        }
      ]
    },
    "mTmillBToPremH": {
      "transfer": [
        {
          "name": "speedPump",
          "type": "Transfer"
        }
      ]
    },
    "mTmillBasToForm": {
      "transfer": [
        {
          "name": "speedPump",
          "type": "Transfer"
        },
        {
          "name": "quantity",
          "type": "Transfer"
        }
      ],
      "feed": [
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "speedPump",
          "type": "Transfer"
        }
      ]
    },
    "mTSmAddToPremix": {
      "feed3341To3811FW": [
        {
          "name": "quantityProcWat",
          "type": "Transfer"
        }
      ],
      "feed3341To3811": [
        {
          "name": "quantityProduct",
          "type": "Transfer"
        },
        {
          "name": "quantityCleanWat",
          "type": "Transfer"
        },
        {
          "name": "cycles",
          "type": "Transfer"
        }
      ]
    },
    "mTSmAddToFormul": {
      "feed3341To5111": [
        {
          "name": "quantityProduct",
          "type": "Transfer"
        },
        {
          "name": "quantityCleanWat",
          "type": "Transfer"
        },
        {
          "name": "cycles",
          "type": "Transfer"
        }
      ],
      "feed3341To5111FW": [
        {
          "name": "quantityProcWat",
          "type": "Transfer"
        }
      ]
    },
    "mTFormuToHolding": {
      "transfer": [
        {
          "name": "speedPump",
          "type": "Transfer"
        },
        {
          "name": "quantity",
          "type": "Transfer"
        }
      ],
      "refill": [
        {
          "name": "speedPump",
          "type": "Transfer"
        },
        {
          "name": "levelMin",
          "type": "Transfer"
        },
        {
          "name": "levelMax",
          "type": "Transfer"
        },
        {
          "name": "quantity",
          "type": "Transfer"
        }
      ]
    },
    "mTFormHoldToHold": {
      "transfer": [
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "transferOrDosing",
          "type": "Transfer"
        },
        {
          "name": "speedPump",
          "type": "Transfer"
        }
      ]
    },
    "mTFormHoldToWast": {
      "transfer": [
        {
          "name": "quantity",
          "type": "Transfer"
        },
        {
          "name": "speedPump",
          "type": "Transfer"
        },
        {
          "name": "transferOrDosing",
          "type": "Transfer"
        }
      ]
    },
    "mTFormHoToFillin": {
      "transfer": [
        {
          "name": "speedPump",
          "type": "Transfer"
        },
        {
          "name": "quantity",
          "type": "Transfer"
        }
      ]
    },
    "sPreserSaToPregl": {
      "feed3341ToPregel": [
        {
          "name": "quantityProduct",
          "type": "Transfer"
        },
        {
          "name": "quantityCip",
          "type": "Transfer"
        },
        {
          "name": "cycles",
          "type": "Transfer"
        },
        {
          "name": "pressureCWater",
          "type": "Transfer"
        }
      ]
    },
    "mTPremToPremH": {
      "transfer": [
        {
          "name": "speedPump",
          "type": "Transfer"
        }
      ],
      "transferFlush": [
        {
          "name": "speedPump",
          "type": "Transfer"
        },
        {
          "name": "quantity",
          "type": "Transfer"
        }
      ],
      "transferFryma": [
        {
          "name": "speedPump",
          "type": "Transfer"
        },
        {
          "name": "speedMill",
          "type": "Transfer"
        }
      ]
    }
  }
};
