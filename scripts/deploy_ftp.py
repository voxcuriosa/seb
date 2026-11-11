#!/usr/bin/env python3
"""
deploy_ftp.py
Laster opp filer fra dist/ til voxcuriosa.no/seb over FTPS (FTP_TLS) med verifisert TLS-sertifikat.
Passord hentes fra macOS-nøkkelringen for kontoen 'cpjvfkip' og tjenesten 'voxcuriosa-ftp'
(med lokal git-ignorert .ftp-password som eventuell reserve).
Laster alltid opp statiske ressurser (assets/) før index.html for atomisk deploy uten 404.
Ingen passord sjekkes inn i git.
"""

import os
import ssl
import sys
import subprocess
from ftplib import FTP_TLS

FTP_HOST = "sleipner.domene.no"
FTP_USER = "cpjvfkip"
FTP_REMOTE_ROOT = "public_html/seb"
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
LOCAL_DIST = os.path.join(REPO_ROOT, "dist")
LOCAL_PW_FILE = os.path.join(REPO_ROOT, ".ftp-password")


def get_ftp_password():
    # 1. Prøv macOS-nøkkelring først
    cmd = ["security", "find-generic-password", "-a", FTP_USER, "-s", "voxcuriosa-ftp", "-w"]
    try:
        pw = subprocess.check_output(cmd, stderr=subprocess.PIPE).decode("utf-8").strip()
        if pw:
            return pw
    except Exception:
        pass

    # 2. Reserve: lokal git-ignorert fil hvis til stede
    if os.path.exists(LOCAL_PW_FILE):
        try:
            with open(LOCAL_PW_FILE, "r", encoding="utf-8") as f:
                pw = f.read().strip()
                if pw:
                    return pw
        except Exception as e:
            print(f"Kunne ikke lese .ftp-password: {e}", file=sys.stderr)

    print("Fant ikke FTP-passord i macOS-nøkkelringen (voxcuriosa-ftp).", file=sys.stderr)
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


def upload_sort_key(item):
    rel_dir, filename, _, _ = item
    normalized_dir = rel_dir.replace(os.sep, "/")
    if normalized_dir == "assets" or normalized_dir.startswith("assets/"):
        return (0, normalized_dir, filename)
    if normalized_dir != ".":
        return (1, normalized_dir, filename)
    if filename != "index.html":
        return (2, normalized_dir, filename)
    return (3, normalized_dir, filename)


def upload_directory(ftp, local_dir, remote_root):
    items = []
    for root, _dirs, files in os.walk(local_dir):
        rel_dir = os.path.relpath(root, local_dir)
        if rel_dir == ".":
            remote_dir = remote_root
        else:
            remote_dir = f"{remote_root}/{rel_dir.replace(os.sep, '/')}"

        for file in files:
            if file.startswith(".DS_Store"):
                continue
            local_file = os.path.join(root, file)
            items.append((rel_dir, file, local_file, remote_dir))

    items.sort(key=upload_sort_key)

    ensured_dirs = set()
    current_dir = None
    for _rel_dir, file, local_file, remote_dir in items:
        if remote_dir not in ensured_dirs:
            ensure_remote_dir(ftp, remote_dir)
            ensured_dirs.add(remote_dir)
        target_cwd = f"/{remote_dir.lstrip('/')}"
        if current_dir != target_cwd:
            ftp.cwd(target_cwd)
            current_dir = target_cwd

        print(f"Laster opp: {file} -> {remote_dir}/")
        with open(local_file, "rb") as f:
            ftp.storbinary(f"STOR {file}", f)


def main():
    if not os.path.exists(LOCAL_DIST):
        print(f"Mappen {LOCAL_DIST} finnes ikke. Kjør 'npm run build' først.")
        sys.exit(1)

    password = get_ftp_password()
    print(f"Kobler til FTPS {FTP_HOST} som {FTP_USER}...")

    ssl_context = ssl.create_default_context()
    ftp = FTP_TLS(context=ssl_context)
    ftp.connect(FTP_HOST, 21, timeout=30)
    ftp.login(FTP_USER, password)
    ftp.prot_p()
    print("Sikker TLS-dataforbindelse med sertifikatsjekk etablert.")

    print(f"Starter opplasting av {LOCAL_DIST} til {FTP_REMOTE_ROOT} (assets før index.html)...")
    upload_directory(ftp, LOCAL_DIST, FTP_REMOTE_ROOT)

    ftp.quit()
    print("\nDeploy til https://voxcuriosa.no/seb/ fullfort!")


if __name__ == "__main__":
    main()
