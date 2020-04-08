#!/bin/bash

if [[ ! -d ../release-builds/ElectroComm-linux-x64 ]]; then
	echo "You have to run 'npm run build-linux' first!";
fi

mkdir -p ~/.local/lib/ElectroComm

cp -r ../release-builds/ElectroComm-linux-x64/* ~/.local/lib/ElectroComm

for x in 16 32 64 128 256 512; do 
	cp icons/${x}x${x}.png ~/.local/share/icons/hicolor/${x}x${x}/apps/electrocomm.png;
done

cat <<EOF > ~/.local/share/applications/ElectroComm.desktop
[Desktop Entry]
Name=ElectroComm
Exec="/home/$(whoami)/.local/lib/ElectroComm/ElectroComm" %U
Terminal=false
Type=Application
Icon=electrocomm
StartupWMClass=ElectroComm
Categories=Network;
EOF

