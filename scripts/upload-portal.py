#!/usr/bin/env python3
"""
upload-portal.py
Laster opp oppdatert index.html for vox_portal til public_html/index.html over FTPS.
"""
import os
import sys
from ftplib import FTP_TLS

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
LOCAL_PW_FILE = os.path.join(REPO_ROOT, ".ftp-password")
PORTAL_INDEX = "/Users/christianborchgrevink-vigeland/Documents/Privat/vox_portal/index.html"

if not os.path.exists(LOCAL_PW_FILE):
    print("Mangler .ftp-password", file=sys.stderr)
    sys.exit(1)

with open(LOCAL_PW_FILE, "r", encoding="utf-8") as f:
    pw = f.read().strip()

ftp = FTP_TLS()
ftp.connect("voxcuriosa.no", 21, timeout=30)
ftp.login("cpjvfkip", pw)
ftp.prot_p()

with open(PORTAL_INDEX, "rb") as f:
    ftp.storbinary("STOR public_html/index.html", f)

print("Hovedsiden voxcuriosa.no er oppdatert med SEB-flisen!")
ftp.quit()
