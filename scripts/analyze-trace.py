#!/usr/bin/env python3
"""
Analyze a Chrome DevTools performance trace (JSON) and print a load-time report.

Usage:
    scripts/analyze-trace.py <path-to-trace.json> [--url-substring localhost:3000]

Outputs:
    - Headline milestones (FP / FCP / DCL / load / LCP) relative to navigationStart
    - Network waterfall (all requests, then slowest 20)
    - Script-load "waves" (groups of requests that start near-simultaneously)
    - Initiators for scripts in the critical path
    - Long main-thread tasks (>=30ms)
    - Long EvaluateScript blocks (>=20ms)
"""

import json
import sys
import argparse
from collections import defaultdict


def load_trace(path):
    with open(path) as f:
        data = json.load(f)
    return data["traceEvents"] if isinstance(data, dict) else data


def find_navigation(events, url_substring):
    """Find the navigationStart for the primary frame matching url_substring."""
    for e in events:
        if e.get("name") != "navigationStart":
            continue
        url = e.get("args", {}).get("data", {}).get("documentLoaderURL", "")
        if url_substring in url:
            return e["ts"], e["pid"], url
    # fallback: first navigationStart with any URL
    for e in events:
        if e.get("name") == "navigationStart":
            url = e.get("args", {}).get("data", {}).get("documentLoaderURL", "")
            if url:
                return e["ts"], e["pid"], url
    return None, None, None


def milestones(events, nav_ts):
    def ms(ts): return (ts - nav_ts) / 1000.0
    results = {}
    for name in ("firstPaint", "firstContentfulPaint", "MarkDOMContent",
                 "MarkLoad", "loadEventEnd"):
        for e in events:
            if e.get("name") == name:
                results[name] = ms(e["ts"])
                break
    # LCP — take last candidate
    lcp_candidates = [e for e in events if e.get("name") == "largestContentfulPaint::Candidate"]
    if lcp_candidates:
        last = max(lcp_candidates, key=lambda e: e["ts"])
        d = last.get("args", {}).get("data", {})
        results["LCP"] = ms(last["ts"])
        results["LCP_node"] = d.get("nodeName")
        results["LCP_size"] = d.get("size")
        results["LCP_type"] = d.get("type")
        results["LCP_candidate_count"] = len(lcp_candidates)
    return results


def collect_requests(events, nav_ts):
    def ms(ts): return (ts - nav_ts) / 1000.0
    reqs = {}
    for e in events:
        n = e.get("name", "")
        d = e.get("args", {}).get("data", {})
        rid = d.get("requestId")
        if not rid:
            continue
        r = reqs.setdefault(rid, {})
        if n == "ResourceSendRequest":
            r["url"] = d.get("url")
            r["send"] = e["ts"]
            r["priority"] = d.get("priority")
            r["type"] = d.get("resourceType")
            r["stack"] = d.get("stackTrace")
        elif n == "ResourceReceiveResponse":
            r["resp"] = e["ts"]
            r["status"] = d.get("statusCode")
            r["mime"] = d.get("mimeType")
        elif n == "ResourceFinish":
            r["finish"] = e["ts"]
            r["bytes"] = d.get("encodedDataLength") or d.get("decodedBodyLength")

    rows = []
    for rid, r in reqs.items():
        if "send" not in r:
            continue
        end = r.get("finish") or r.get("resp") or r["send"]
        rows.append({
            "start": ms(r["send"]),
            "dur": (end - r["send"]) / 1000.0,
            "type": r.get("type"),
            "priority": r.get("priority"),
            "status": r.get("status"),
            "bytes": r.get("bytes"),
            "url": r.get("url") or "",
            "stack": r.get("stack"),
        })
    rows.sort(key=lambda r: r["start"])
    return rows


def detect_waves(rows, gap_ms=200):
    """Group requests into waves by start-time gaps."""
    waves = []
    current = []
    last_start = None
    for r in rows:
        if last_start is None or (r["start"] - last_start) <= gap_ms:
            current.append(r)
        else:
            waves.append(current)
            current = [r]
        last_start = r["start"]
    if current:
        waves.append(current)
    return waves


def long_tasks(events, nav_pid, nav_ts, min_dur_ms=30, window_ms=10000):
    def ms(ts): return (ts - nav_ts) / 1000.0
    out = []
    targets = {"RunTask", "Task", "FunctionCall", "EvaluateScript",
               "v8.compile", "ParseHTML"}
    for e in events:
        if e.get("pid") != nav_pid or e.get("ph") != "X":
            continue
        if e.get("name") not in targets:
            continue
        dur = e.get("dur", 0) / 1000.0
        if dur < min_dur_ms:
            continue
        t = ms(e["ts"])
        if t < 0 or t > window_ms:
            continue
        d = e.get("args", {}).get("data", {}) or {}
        out.append({"start": t, "dur": dur, "name": e["name"],
                    "url": d.get("url") or d.get("fileName") or ""})
    out.sort(key=lambda r: r["start"])
    return out


def fmt_ms(v):
    return f"{v:8.1f}" if v is not None else "       -"


def main():
    ap = argparse.ArgumentParser(description="Analyze a Chrome DevTools trace.")
    ap.add_argument("trace", help="Path to trace JSON")
    ap.add_argument("--url-substring", default="localhost:3000",
                    help="Substring to match the navigation URL (default: localhost:3000)")
    ap.add_argument("--wave-gap-ms", type=int, default=200,
                    help="Max gap (ms) between request starts to count as same wave (default: 200)")
    args = ap.parse_args()

    events = load_trace(args.trace)
    nav_ts, nav_pid, nav_url = find_navigation(events, args.url_substring)
    if nav_ts is None:
        print(f"ERROR: no navigationStart matching '{args.url_substring}' found")
        sys.exit(1)

    print(f"Trace: {args.trace}")
    print(f"Navigation: {nav_url}")
    print(f"PID: {nav_pid}, navigationStart ts={nav_ts}")
    print(f"Total events: {len(events)}")
    print()

    print("=" * 70)
    print("MILESTONES (ms from navigationStart)")
    print("=" * 70)
    m = milestones(events, nav_ts)
    for k in ("firstPaint", "firstContentfulPaint", "MarkDOMContent",
              "MarkLoad", "loadEventEnd", "LCP"):
        v = m.get(k)
        print(f"  {k:25} {fmt_ms(v)} ms")
    if "LCP" in m:
        print(f"  LCP element: <{m.get('LCP_node')}> "
              f"size={m.get('LCP_size')} type={m.get('LCP_type')} "
              f"candidates={m.get('LCP_candidate_count')}")
    print()

    rows = collect_requests(events, nav_ts)

    print("=" * 70)
    print(f"NETWORK ({len(rows)} requests, by start time)")
    print("=" * 70)
    print(f"{'start_ms':>9} {'dur_ms':>8} {'type':>10} {'pri':>9} {'st':>4} {'bytes':>9}  url")
    for r in rows:
        url = r["url"][:120]
        print(f"{r['start']:9.1f} {r['dur']:8.1f} "
              f"{str(r['type'])[:10]:>10} {str(r['priority'])[:9]:>9} "
              f"{str(r['status'])[:4]:>4} {str(r['bytes'])[:9]:>9}  {url}")
    print()

    print("=" * 70)
    print("SLOWEST 20 REQUESTS")
    print("=" * 70)
    print(f"{'start_ms':>9} {'dur_ms':>8} {'type':>10} {'pri':>9} {'st':>4} {'bytes':>9}  url")
    for r in sorted(rows, key=lambda r: -r["dur"])[:20]:
        url = r["url"][:120]
        print(f"{r['start']:9.1f} {r['dur']:8.1f} "
              f"{str(r['type'])[:10]:>10} {str(r['priority'])[:9]:>9} "
              f"{str(r['status'])[:4]:>4} {str(r['bytes'])[:9]:>9}  {url}")
    print()

    print("=" * 70)
    print(f"REQUEST WAVES (gap > {args.wave_gap_ms} ms triggers a new wave)")
    print("=" * 70)
    waves = detect_waves(rows, gap_ms=args.wave_gap_ms)
    for i, w in enumerate(waves, 1):
        start = w[0]["start"]
        end = max(r["start"] + r["dur"] for r in w)
        print(f"\n-- Wave {i}: starts {start:.1f}ms, ends {end:.1f}ms, "
              f"{len(w)} requests --")
        for r in w[:40]:
            short = r["url"].split("/")[-1][:60] if r["url"] else ""
            init = ""
            if r.get("stack"):
                top = r["stack"][0]
                init = f"  <- {top.get('functionName','') or '(anon)'} " \
                       f"{top.get('url','').split('/')[-1]}:{top.get('lineNumber','')}"
            print(f"  {r['start']:8.1f}  {r['dur']:7.1f}ms  "
                  f"{str(r['type'])[:8]:>8}  {short}{init}")
        if len(w) > 40:
            print(f"  ... +{len(w)-40} more")
    print()

    print("=" * 70)
    print("LONG MAIN-THREAD TASKS (>=30 ms, first 10 s)")
    print("=" * 70)
    lt = long_tasks(events, nav_pid, nav_ts)
    if not lt:
        print("  (none — main thread is not the bottleneck)")
    else:
        print(f"{'start_ms':>9} {'dur_ms':>8} {'name':>20}  detail")
        for t in lt[:50]:
            detail = t["url"][-80:] if t["url"] else ""
            print(f"{t['start']:9.1f} {t['dur']:8.1f} {t['name']:>20}  {detail}")
        if len(lt) > 50:
            print(f"  ... +{len(lt)-50} more")
    print()

    print("=" * 70)
    print("DUPLICATE REQUESTS (same URL fetched more than once)")
    print("=" * 70)
    by_url = defaultdict(list)
    for r in rows:
        by_url[r["url"]].append(r["start"])
    dups = [(u, ts) for u, ts in by_url.items() if len(ts) > 1]
    if not dups:
        print("  (none)")
    else:
        for url, ts in sorted(dups, key=lambda x: -len(x[1])):
            short = url[-100:] if len(url) > 100 else url
            print(f"  x{len(ts)}  {short}")
    print()


if __name__ == "__main__":
    main()
