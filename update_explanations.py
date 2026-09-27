import re

path = 'c:/Users/shiva/projects/METSHIELD AI/MetShield-AI-recovered/lib/anomalyDetector.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace WMO limit breach explanation
content = re.sub(
    r"diagnosticExplanation:\s*`Breach detected: \$\{tLimitBreached.*?`",
    r"diagnosticExplanation: `Physical Climatological Breach: The ${tLimitBreached ? `Temperature sensor ` : ''}${pLimitBreached ? `Barometer ` : ''}${rhLimitBreached ? `Humidity sensor ` : ''}is broadcasting values outside WMO limits. Hardware malfunction likely.`",
    content
)

# Replace probe freeze explanation
content = re.sub(
    r"diagnosticExplanation:\s*`Static signal locked.*?`",
    r"diagnosticExplanation: `Sensor Physically Jammed: The ${isTFrozen ? 'Thermometer ' : ''}${isPFrozen ? 'Barometer ' : ''}${isRHFrozen ? 'Humidity probe ' : ''}is stuck on the exact same value for 6 cycles. Dispatch technician.`",
    content
)

# Replace convective storm explanation
content = re.sub(
    r"diagnosticExplanation:\s*`Genuine convective downdraft signature.*?`",
    r"diagnosticExplanation: `Severe Convective Storm Confirmed: Deep barometric pressure plunge accompanied by a moisture surge. Genuine weather event; sensors are nominal.`",
    content
)

# Replace isolated spike explanation
content = re.sub(
    r"diagnosticExplanation:\s*`Isolated uncoupled step jump.*?`",
    r"diagnosticExplanation: `Hardware Open-Circuit Spike: An isolated, massive jump occurred on the ${isTempSpike ? 'Temperature' : ''}${isPressStep ? 'Pressure' : ''}${isHumStep ? 'Humidity' : ''} channel. Quarantined and activated moving-average imputation.`",
    content
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated anomaly explanations to natural language.")
