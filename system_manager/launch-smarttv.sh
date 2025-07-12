#!/bin/bash

# will be auto created by setup.sh

xset s off -dpms
xset s noblank

unclutter -idle 2 &

exec smart-tv-ui
