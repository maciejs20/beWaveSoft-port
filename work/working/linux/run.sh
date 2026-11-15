#!/usr/bin/env bash
# --no-sandbox: chrome-sandbox cannot be setuid root on this NFS share
# absolute path: the app changes its cwd, and app.relaunch() re-executes argv[0]
unset ELECTRON_RUN_AS_NODE
exec "$(dirname "$(readlink -f "$0")")/bewave-soft" --no-sandbox "$@"
