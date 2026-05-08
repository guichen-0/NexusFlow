import json, os

data = {
    "beta5": {
        "path": r"F:\360MoveData\Users\Administrator\Desktop\beta5",
        "type": "local"
    }
}

data_dir = r"F:\360MoveData\Users\Administrator\Desktop\beta4\nexusflow\backend\app\data"
os.makedirs(data_dir, exist_ok=True)

file_path = os.path.join(data_dir, "local_workspaces.json")
with open(file_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Written to:", file_path)
with open(file_path, "r", encoding="utf-8") as f:
    print(f.read())
