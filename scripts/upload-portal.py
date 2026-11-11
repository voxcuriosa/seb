#!/usr/bin/env python3
"""
upload-portal.py
Laster opp oppdatert index.html for vox_portal til public_html/index.html over FTPS.
Passord hentes utelukkende fra macOS-nøkkelringen (tjeneste 'voxcuriosa-ftp').
"""
import ssl
import subprocess
import sys
from ftplib import FTP_TLS

FTP_HOST = "sleipner.domene.no"
FTP_USER = "cpjvfkip"
PORTAL_INDEX = "/Users/christianborchgrevink-vigeland/Documents/Privat/vox_portal/index.html"


def get_ftp_password():
    cmd = ["security", "find-generic-password", "-a", FTP_USER, "-s", "voxcuriosa-ftp", "-w"]
    try:
        pw = subprocess.check_output(cmd, stderr=subprocess.PIPE).decode("utf-8").strip()
        if pw:
            return pw
    except Exception:
        pass
    print("Fant ikke FTP-passord i macOS-nøkkelringen (voxcuriosa-ftp).", file=sys.stderr)
    sys.exit(1)


def main():
    pw = get_ftp_password()
    ssl_context = ssl.create_default_context()
    ftp = FTP_TLS(context=ssl_context)
    ftp.connect(FTP_HOST, 21, timeout=30)
    ftp.login(FTP_USER, pw)
    ftp.prot_p()

    with open(PORTAL_INDEX, "rb") as f:
        ftp.storbinary("STOR public_html/index.html", f)

    print("Hovedsiden voxcuriosa.no er oppdatert med SEB-flisen!")
    ftp.quit()


if __name__ == "__main__":
    main()
