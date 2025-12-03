# filter_fixture.py
import json
import sys

# Usage: python filter_fixture.py <full_model_name_to_exclude> <input_file> <output_file>
# Example model_name: 'myapp.order'

if len(sys.argv) != 4:
    print("Usage: python filter_fixture.py <full_model_name_to_exclude> <input_file> <output_file>")
    sys.exit(1)

model_to_exclude = sys.argv[1].lower()
input_file = sys.argv[2]
output_file = sys.argv[3]

try:
    with open(input_file, 'r') as f:
        data = json.load(f)
except FileNotFoundError:
    print(f"Error: Input file '{input_file}' not found.")
    sys.exit(1)
except json.JSONDecodeError:
    print(f"Error: Input file '{input_file}' is not valid JSON.")
    sys.exit(1)

# Filter out entries for the specified model
# The JSON fixture uses the format 'app_label.model_name'
filtered_data = [item for item in data if item.get('model', '').lower() != model_to_exclude]

# Optional: Log how many records were filtered
filtered_count = len(data) - len(filtered_data)
print(f"Original records: {len(data)}")
print(f"Filtered out: {filtered_count} records for model '{model_to_exclude}'")

with open(output_file, 'w') as f:
    json.dump(filtered_data, f, indent=4)
print(f"Successfully saved remaining {len(filtered_data)} records to '{output_file}'")
