#!/usr/bin/env python3
"""
deploy_ftp.py
Laster opp filer fra dist/ til voxcuriosa.no/seb over FTPS (FTP_TLS).
Passord hentes først fra .ftp-password (lokal git-ignorert fil),
eller fra macOS-nøkkelringen for kontoen 'cpjvfkip' og tjenesten 'voxcuriosa-ftp'.
Ingen passord sjekkes inn i git.
"""

import os
import sys
import subprocess
from ftplib import FTP_TLS

FTP_HOST = "voxcuriosa.no"
FTP_USER = "cpjvfkip"
FTP_REMOTE_ROOT = "public_html/seb"
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
LOCAL_DIST = os.path.join(REPO_ROOT, "dist")
LOCAL_PW_FILE = os.path.join(REPO_ROOT, ".ftp-password")

def get_ftp_password():
    # 1. Sjekk lokal git-ignorert fil først
    if os.path.exists(LOCAL_PW_FILE):
        try:
            with open(LOCAL_PW_FILE, "r", encoding="utf-8") as f:
                pw = f.read().strip()
                if pw:
                    return pw
        except Exception as e:
            print(f"Kunne ikke lese .ftp-password: {e}", file=sys.stderr)

    # 2. Prøv macOS-nøkkelring
    cmd = ["security", "find-generic-password", "-a", FTP_USER, "-s", "voxcuriosa-ftp", "-w"]
    try:
        pw = subprocess.check_output(cmd, stderr=subprocess.PIPE).decode("utf-8").strip()
        if pw:
            return pw
    except Exception:
        pass

    print("Fant verken passord i .ftp-password eller i macOS-nøkkelringen (voxcuriosa-ftp).", file=sys.stderr)
    sys.exit(1)

def ensure_remote_dir(ftp, remote_path):
    parts = remote_path.strip("/").split("/")
    current = ""
    for part in parts:
        current += "/" + part
        try:
            ftp.cwd(current)
        except Exception:
            try:
                ftp.mkd(current)
                ftp.cwd(current)
            except Exception as e:
                print(f"Kunne ikke opprette mappe {current}: {e}")

def upload_directory(ftp, local_dir, remote_root):
    for root, dirs, files in os.walk(local_dir):
        rel_path = os.path.relpath(root, local_dir)
        if rel_path == ".":
            remote_dir = remote_root
        else:
            remote_dir = f"{remote_root}/{rel_path.replace(os.sep, '/')}"
        
        ensure_remote_dir(ftp, remote_dir)
        ftp.cwd(f"/{remote_dir.lstrip('/')}")
        
        for file in files:
            if file.startswith(".DS_Store"):
                continue
            local_file = os.path.join(root, file)
            print(f"Laster opp: {file} -> {remote_dir}/")
            with open(local_file, "rb") as f:
                ftp.storbinary(f"STOR {file}", f)

def main():
    if not os.path.exists(LOCAL_DIST):
        print(f"Mappen {LOCAL_DIST} finnes ikke. Kjør 'npm run build' først.")
        sys.exit(1)

    password = get_ftp_password()
    print(f"Kobler til FTPS {FTP_HOST} som {FTP_USER}...")
    
    ftp = FTP_TLS()
    ftp.connect(FTP_HOST, 21, timeout=30)
    ftp.login(FTP_USER, password)
    ftp.prot_p()
    print("Sikker TLS-dataforbindelse etablert.")

    print(f"Starter opplasting av {LOCAL_DIST} til {FTP_REMOTE_ROOT}...")
    upload_directory(ftp, LOCAL_DIST, FTP_REMOTE_ROOT)
    
    ftp.quit()
    print("\nDeploy til https://voxcuriosa.no/seb/ fullfort!")

if __name__ == "__main__":
    main()
