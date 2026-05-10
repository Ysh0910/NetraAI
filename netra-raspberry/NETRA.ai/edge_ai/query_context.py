#!/usr/bin/env python3
"""
Query and analyze stored context data.
Useful for debugging and pattern analysis.
"""
import sys
import json
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from edge_ai.storage.context_store import ContextStore


def print_statistics(store: ContextStore):
    """Print context store statistics."""
    stats = store.get_statistics()
    
    print("\n" + "="*70)
    print("CONTEXT STORE STATISTICS")
    print("="*70)
    print(f"  Total Entries    : {stats['total_entries']}")
    print(f"  Memory Usage     : {stats['memory_usage']}/{stats['memory_capacity']}")
    print(f"  Avg Risk Score   : {stats['avg_risk_score']}")
    print(f"  Session File     : {stats['session_file']}")
    
    if stats['oldest_timestamp']:
        print(f"  Oldest Entry     : {stats['oldest_timestamp']}")
        print(f"  Newest Entry     : {stats['newest_timestamp']}")
    
    print("\n  Threat Distribution:")
    for level, count in stats['threat_distribution'].items():
        percentage = (count / stats['total_entries']) * 100
        print(f"    {level:12s} : {count:3d} ({percentage:5.1f}%)")
    print("="*70 + "\n")


def print_recent_entries(store: ContextStore, count: int = 5):
    """Print recent context entries."""
    entries = store.get_recent_context(count)
    
    print(f"\nRECENT {count} ENTRIES")
    print("="*70)
    
    for i, entry in enumerate(entries, 1):
        print(f"\n{i}. Tick {entry['tick']} | Timestamp {entry['timestamp']}")
        print(f"   Squad: {len(entry['squad'])} members")
        print(f"   Primary: {entry['assessment']['primary_soldier_id']}")
        print(f"   Threat: {entry['assessment']['threat_level']} (Risk: {entry['assessment']['risk_score']:.2f})")
        print(f"   Distance: {entry['assessment']['enemy_distance']:.1f}m")
        print(f"   Decision: {entry['decision']}")
        print(f"   Latency: {entry['latency_ms']}ms")
    
    print("="*70 + "\n")


def print_soldier_history(store: ContextStore, soldier_id: str, count: int = 5):
    """Print history for a specific soldier."""
    history = store.get_soldier_history(soldier_id, count)
    
    print(f"\nHISTORY FOR SOLDIER: {soldier_id}")
    print("="*70)
    
    if not history:
        print("  No history found for this soldier.")
    else:
        for i, entry in enumerate(history, 1):
            # Find the soldier in the squad
            soldier = None
            for s in entry['squad']:
                if s['id'] == soldier_id or s['callsign'] == soldier_id:
                    soldier = s
                    break
            
            if soldier:
                print(f"\n{i}. Tick {entry['tick']}")
                print(f"   Position: ({soldier['lat']:.4f}, {soldier['lng']:.4f})")
                print(f"   Heart Rate: {soldier['heartRate']} bpm")
                print(f"   Battery: {soldier['battery']}%")
                print(f"   Status: {soldier['status']}")
                print(f"   Threat: {entry['assessment']['threat_level']}")
    
    print("="*70 + "\n")


def print_threat_patterns(store: ContextStore, threat_level: str, count: int = 5):
    """Print entries with specific threat level."""
    entries = store.get_threat_pattern(threat_level, count)
    
    print(f"\n{threat_level} THREAT PATTERNS ({len(entries)} entries)")
    print("="*70)
    
    for i, entry in enumerate(entries, 1):
        print(f"\n{i}. Tick {entry['tick']}")
        print(f"   Distance: {entry['assessment']['enemy_distance']:.1f}m")
        print(f"   Risk Score: {entry['assessment']['risk_score']:.2f}")
        print(f"   Squad Status: {entry['assessment']['squad_status']}")
        print(f"   Decision: {entry['decision']}")
    
    print("="*70 + "\n")


def export_data(store: ContextStore, output_file: str):
    """Export context data to JSON file."""
    store.export_to_json(output_file)
    print(f"\n✓ Data exported to: {output_file}\n")


def main():
    """Main entry point."""
    print("\n" + "="*70)
    print("EDGE AI COPILOT - CONTEXT QUERY TOOL")
    print("="*70)
    
    # Initialize context store
    store = ContextStore()
    
    # Check if there's any data
    stats = store.get_statistics()
    if stats['total_entries'] == 0:
        print("\n⚠ No context data available yet.")
        print("  Run the copilot to generate data: python3 main.py\n")
        return
    
    # Show menu
    while True:
        print("\nOptions:")
        print("  1. Show statistics")
        print("  2. Show recent entries")
        print("  3. Show soldier history")
        print("  4. Show threat patterns")
        print("  5. Export data to JSON")
        print("  6. Exit")
        
        choice = input("\nEnter choice (1-6): ").strip()
        
        if choice == "1":
            print_statistics(store)
        
        elif choice == "2":
            count = input("How many entries? (default 5): ").strip()
            count = int(count) if count else 5
            print_recent_entries(store, count)
        
        elif choice == "3":
            soldier_id = input("Enter soldier ID or callsign: ").strip()
            count = input("How many entries? (default 5): ").strip()
            count = int(count) if count else 5
            print_soldier_history(store, soldier_id, count)
        
        elif choice == "4":
            print("\nThreat levels: CRITICAL, HIGH, MEDIUM, LOW")
            level = input("Enter threat level: ").strip().upper()
            count = input("How many entries? (default 5): ").strip()
            count = int(count) if count else 5
            print_threat_patterns(store, level, count)
        
        elif choice == "5":
            output = input("Output file (default: context_export.json): ").strip()
            output = output if output else "context_export.json"
            export_data(store, output)
        
        elif choice == "6":
            print("\nGoodbye!\n")
            break
        
        else:
            print("\n⚠ Invalid choice. Please enter 1-6.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInterrupted by user. Goodbye!\n")
    except Exception as e:
        print(f"\n✗ Error: {e}\n")
        import traceback
        traceback.print_exc()
