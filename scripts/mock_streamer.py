#!/usr/bin/env python3
"""
================================================================================
SIH 2026 - Problem SIH26073: Ministry of Earth Sciences (MoES) / IMD
Hardware/Edge Telemetry Mock Streaming Simulator (Satyam & Sundram)
================================================================================

Simulates real-time 2.5-second AWS DCP telemetry streaming from remote stations
to the NAWS-QMS Next.js Ingestion API.

Features:
- Periodic 2.5-second INSAT-3D DCP telemetry transmission
- Realistic diurnal thermodynamic physics for 3 core parameters:
  * Temperature (T, °C)
  * Atmospheric Pressure (P, hPa)
  * Relative Humidity (RH, %)
- Dynamic fault injection modes for live jury evaluation:
  1. Nominal Diurnal Operation (WMO Flag 1)
  2. Thermistor Open-Circuit Spike (PT100 fault, WMO Flag 4)
  3. Stuck ADC / Signal Wire Disconnect (Frozen sensor loop, WMO Flag 4)
  4. Barometer Gradual Monotonic Drift (WMO Flag 3)
  5. Genuine Convective Storm Front (Barometric plunge + humidity surge, WMO Flag 2)
  6. Packet Loss / Malformed Payload (WMO Flag 5)
================================================================================
"""

import argparse
import json
import math
import random
import sys
import time
import urllib.request
import urllib.error

# ANSI Terminal Color Codes
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    RESET = '\033[0m'
    BOLD = '\033[1m'
    DIM = '\033[2m'

STATION_PROFILES = {
    "AWS-DEL-04": {"name": "Safdarjung Observatory, New Delhi", "baseT": 32.5, "baseP": 1008.2, "baseRH": 62.0},
    "AWS-MUM-01": {"name": "Santacruz Coastal Station, Mumbai", "baseT": 29.8, "baseP": 1012.4, "baseRH": 82.0},
    "AWS-KOL-02": {"name": "Alipore Met Observatory, Kolkata", "baseT": 31.2, "baseP": 1009.6, "baseRH": 78.0},
    "AWS-CHN-03": {"name": "Meenambakkam Regional Centre, Chennai", "baseT": 33.1, "baseP": 1010.8, "baseRH": 74.0},
    "AWS-BLR-05": {"name": "Bengaluru Urban Observation Hub, Karnataka", "baseT": 27.4, "baseP": 985.0, "baseRH": 58.0},
}

def generate_telemetry_payload(station_id, tick, scenario, drift_accum):
    """Calculates thermodynamic parameters based on current tick and scenario."""
    profile = STATION_PROFILES.get(station_id, STATION_PROFILES["AWS-DEL-04"])
    
    # 24-hour diurnal sinusoidal baseline
    phase = ((tick % 60) / 60.0) * 2.0 * math.pi
    temp = profile["baseT"] + math.sin(phase - 1.0) * 4.5 + (random.random() - 0.5) * 0.2
    press = profile["baseP"] + math.cos(phase * 2.0) * 1.8 + (random.random() - 0.5) * 0.15
    hum = profile["baseRH"] - math.sin(phase - 1.0) * 12.0 + (random.random() - 0.5) * 0.3

    temp = round(max(-10.0, min(55.0, temp)), 2)
    press = round(max(920.0, min(1050.0, press)), 1)
    hum = round(max(5.0, min(100.0, hum)), 1)

    # Scenario Overrides
    if scenario == "spike":
        # PT100 RTD open-circuit resistance jump
        temp = round(54.5 + random.random() * 2.5, 2)
    elif scenario == "freeze":
        # Microcontroller stuck ADC register / frozen sensor loop
        temp = 32.415
    elif scenario == "drift":
        # Barometer monotonic drift (-0.45 hPa per tick)
        press = round(press - drift_accum, 1)
    elif scenario == "storm":
        # Severe convective squall: Barometric plunge coupled with humidity saturation & evaporative cooling
        press = round(press - 4.5, 1)
        hum = round(min(98.5, hum + 22.0), 1)
        temp = round(temp - 3.5, 2)
    elif scenario == "packet_loss":
        # Malformed packet / RF carrier lost
        temp = None
        press = None
        hum = None

    return {
        "stationId": station_id,
        "temperature": temp,
        "pressure": press,
        "humidity": hum,
        "timestamp": int(time.time() * 1000),
    }

def send_telemetry(api_url, payload):
    """Sends JSON payload to the NAWS-QMS Next.js Ingestion API."""
    data_bytes = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        api_url,
        data=data_bytes,
        headers={'Content-Type': 'application/json', 'User-Agent': 'AWS-Edge-Simulator/1.0'}
    )
    
    start = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            latency = (time.perf_counter() - start) * 1000.0
            body = response.read().decode('utf-8')
            return json.loads(body), latency, response.status
    except urllib.error.HTTPError as e:
        latency = (time.perf_counter() - start) * 1000.0
        try:
            body = e.read().decode('utf-8')
            return json.loads(body), latency, e.code
        except Exception:
            return {"error": str(e)}, latency, e.code
    except Exception as e:
        latency = (time.perf_counter() - start) * 1000.0
        return {"error": str(e)}, latency, 0

def format_flag_badge(flag):
    if flag == "FLAG_1_VERIFIED_GOOD":
        return f"{Colors.GREEN}[FLAG 1: VALIDATED]{Colors.RESET}"
    elif flag == "FLAG_2_CONVECTIVE_STORM":
        return f"{Colors.CYAN}[FLAG 2: SEVERE STORM]{Colors.RESET}"
    elif flag == "FLAG_3_SUSPECT_DRIFT":
        return f"{Colors.YELLOW}[FLAG 3: SENSOR DRIFT]{Colors.RESET}"
    elif flag == "FLAG_4_CORRUPT_HARDWARE":
        return f"{Colors.RED}[FLAG 4: HARDWARE FAULT]{Colors.RESET}"
    elif flag == "FLAG_5_PACKET_LOSS":
        return f"{Colors.HEADER}[FLAG 5: PACKET LOSS]{Colors.RESET}"
    return flag

def main():
    parser = argparse.ArgumentParser(description="SIH26073 Telemetry Mock Streaming Simulator")
    parser.add_argument("--url", default="http://localhost:3000/api/telemetry", help="Target API endpoint URL")
    parser.add_argument("--station", default="AWS-DEL-04", choices=list(STATION_PROFILES.keys()), help="Target Station ID")
    parser.add_argument("--scenario", default="normal", choices=["normal", "spike", "freeze", "drift", "storm", "packet_loss"], help="Operating scenario")
    parser.add_argument("--interval", type=float, default=2.5, help="Telemetry cycle interval in seconds (default: 2.5s)")
    parser.add_argument("--count", type=int, default=0, help="Number of packets to send (0 = infinite)")
    args = parser.parse_args()

    print(f"{Colors.BOLD}{Colors.CYAN}========================================================================{Colors.RESET}")
    print(f"{Colors.BOLD}GOVERNMENT OF INDIA — MINISTRY OF EARTH SCIENCES (MoES) / IMD{Colors.RESET}")
    print(f"{Colors.BOLD}PROBLEM SIH26073: NAWS-QMS REAL-TIME TELEMETRY EDGE STREAMER{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}========================================================================{Colors.RESET}")
    print(f"Target API Endpoint : {Colors.BOLD}{args.url}{Colors.RESET}")
    print(f"Station Node        : {Colors.BOLD}{args.station} ({STATION_PROFILES[args.station]['name']}){Colors.RESET}")
    print(f"Injection Scenario  : {Colors.YELLOW}{args.scenario.upper()}{Colors.RESET}")
    print(f"Cycle Rate          : {args.interval} seconds / observation packet")
    print(f"{Colors.DIM}Press Ctrl+C to safely terminate stream.{Colors.RESET}\n")

    tick = 0
    drift_accum = 0.0

    try:
        while True:
            tick += 1
            if args.scenario == "drift":
                drift_accum += 0.45

            payload = generate_telemetry_payload(args.station, tick, args.scenario, drift_accum)
            res, latency, status = send_telemetry(args.url, payload)

            t_str = f"{payload['temperature']}°C" if payload['temperature'] is not None else "NULL"
            p_str = f"{payload['pressure']}hPa" if payload['pressure'] is not None else "NULL"
            h_str = f"{payload['humidity']}%" if payload['humidity'] is not None else "NULL"

            now_str = time.strftime('%H:%M:%S', time.localtime())

            if status == 200 and res.get("success"):
                data = res.get("data", {})
                wmo_flag = data.get("wmoFlag", "UNKNOWN")
                classification = data.get("classification", "UNKNOWN")
                alert = data.get("alertLevel", "NOMINAL")
                xai = data.get("xaiAttribution", {})
                imputed = data.get("imputed", {})

                flag_badge = format_flag_badge(wmo_flag)
                print(f"[{now_str}] #{tick:03d} | Raw: T={t_str:>7} P={p_str:>9} RH={h_str:>6} | {flag_badge} {classification:<22} | {latency:.1f}ms")
                if classification != "NOMINAL_OPERATION":
                    print(f"   ↳ {Colors.BOLD}XAI Attribution:{Colors.RESET} T={xai.get('tempWeight')}% P={xai.get('pressWeight')}% RH={xai.get('humWeight')}% | Primary: {xai.get('primaryParameter')}")
                    print(f"   ↳ {Colors.BOLD}WMO Imputation:{Colors.RESET}  T={imputed.get('temperature')}°C P={imputed.get('pressure')}hPa RH={imputed.get('humidity')}% (Corrected: {imputed.get('wasCorrected')})")
                    print(f"   ↳ {Colors.DIM}Action: {data.get('operationalAction')}{Colors.RESET}")
            else:
                print(f"{Colors.RED}[{now_str}] #{tick:03d} | HTTP {status} Error: {res.get('error', 'Connection Refused')}{Colors.RESET}")

            if args.count > 0 and tick >= args.count:
                print(f"\n{Colors.GREEN}Completed requested count of {args.count} packets.{Colors.RESET}")
                break

            time.sleep(args.interval)

    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Streaming simulator stopped by operator.{Colors.RESET}")
        sys.exit(0)

if __name__ == "__main__":
    main()
