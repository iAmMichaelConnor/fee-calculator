# wrkr

## Install

`npm i`
`npm i -g ./`

## Run as a daemon

`cd /usr/lib/systemd/user` here there be daemons.

`sudo nano wrkr.service` to create a new daemon service file and start editing.

Copy the below into the `wrkr.service` file:
```
[Unit]
Description=Wrkr
After=network.target
StartLimitIntervalSec=60
StartLimitBurst=3

[Service]
Type=simple
Restart=always
RestartSec=15
ExecStart=/home/mike/.nvm/versions/node/v14.16.0/bin/wrkr --pk <PUT YOUR SNARK WORKER PK HERE>

[Install]
WantedBy=multi-user.target
```

`cd ~` - we may as well go back to somewhere more familiar.

To start the daemon:
```
systemctl --user daemon-reload
systemctl --user start wrkr
systemctl --user enable wrkr
sudo loginctl enable-linger
```
^^^These commands will allow the node to continue running after you logout, and restart automatically when the machine reboots.

`systemctl --user status wrkr` This command will let you know if the wrkr had any trouble getting started.

`systemctl --user stop wrkr` to stop the wrkr gracefully, and to stop automatically-restarting the service.

`systemctl --user restart wrkr` to manually restart it.

`journalctl --user -u wrkr -n 1000 -f` to look at logs.
