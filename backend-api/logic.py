def decide_event(labels: list[str]) -> tuple[str, str]:

    if "Person" in labels and "NO-Hardhat" in labels:
        return "PPE_VIOLATION", "HIGH"

    if "Person" in labels and "NO-Safety Vest" in labels:
        return "PPE_VIOLATION", "HIGH"

    return "Normal", "LOW"
