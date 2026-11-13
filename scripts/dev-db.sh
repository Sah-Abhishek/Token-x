#!/usr/bin/env bash
# Local Postgres for TokenX development.
#
# A private cluster owned by your own user, so it needs no sudo and does not
# touch the system-wide Postgres service. Data lives outside the repo.
#
#   ./scripts/dev-db.sh start | stop | status | psql
set -euo pipefail

PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
PGDATA=${PGDATA:-"$HOME/.local/share/tokenx-postgres"}
PGPORT=${PGPORT:-55432}
DBNAME=${DBNAME:-tokenx}

# Unix sockets are disabled: the socket path limit is 107 bytes and TCP on
# loopback is all the app needs.
PGOPTS="-p $PGPORT -h 127.0.0.1 -c unix_socket_directories="

case "${1:-status}" in
  start)
    if [ ! -d "$PGDATA" ]; then
      echo "Creating a new cluster in $PGDATA"
      "$PGBIN/initdb" -D "$PGDATA" -U "$USER" --auth=trust --no-locale -E UTF8 >/dev/null
    fi
    "$PGBIN/pg_ctl" -D "$PGDATA" -o "$PGOPTS" -l "$PGDATA/server.log" -w start
    "$PGBIN/psql" -h 127.0.0.1 -p "$PGPORT" -d postgres -tAc \
      "select 1 from pg_database where datname='$DBNAME'" | grep -q 1 \
      || "$PGBIN/createdb" -h 127.0.0.1 -p "$PGPORT" "$DBNAME"
    echo "Ready: postgresql://$USER@127.0.0.1:$PGPORT/$DBNAME"
    ;;
  stop)
    "$PGBIN/pg_ctl" -D "$PGDATA" -m fast -w stop
    ;;
  status)
    "$PGBIN/pg_ctl" -D "$PGDATA" status || true
    ;;
  psql)
    "$PGBIN/psql" -h 127.0.0.1 -p "$PGPORT" -d "$DBNAME"
    ;;
  *)
    echo "usage: $0 {start|stop|status|psql}" >&2
    exit 1
    ;;
esac
