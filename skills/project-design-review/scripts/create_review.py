"""Copy the reusable comparator to a new directory, preserving existing reviews."""
from pathlib import Path
import argparse
import shutil

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('destination',type=Path)
parser.add_argument('--mode',choices=['brief','full'],default='brief')
args=parser.parse_args()
source=Path(__file__).resolve().parents[1]/'assets'/'comparator'
destination=args.destination.expanduser().resolve()
if destination.exists(): parser.error('Destination already exists; choose a new review folder or edit the existing review in place.')
shutil.copytree(source,destination)
data_file=destination/'review-data.js'
data_file.write_text(data_file.read_text(encoding='utf-8').replace("reviewMode:'brief'",f"reviewMode:'{args.mode}'"),encoding='utf-8')
print(f'Created {destination}\nEdit review-data.js and add screenshots. Start with node review-server.mjs from this folder.')
