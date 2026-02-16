from logic import decide_event

def test_no_hardhat_violation():
    event_type, severity = decide_event(["Person", "NO-Hardhat"])
    assert event_type == "PPE_VIOLATION"
    assert severity == "HIGH"

def test_no_vest_violation():
    event_type, severity = decide_event(["Person", "NO-Safety Vest"])
    assert event_type == "PPE_VIOLATION"
    assert severity == "HIGH"

def test_normal_case():
    event_type, severity = decide_event(["Person", "Hardhat"])
    assert event_type == "Normal"
    assert severity == "LOW"
