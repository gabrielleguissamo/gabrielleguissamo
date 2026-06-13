#!/bin/bash
echo "Sincronizando arquivos..."
unzip -o ~/Downloads/terapoorigin2.zip "terapo-pro/src/*" "terapo-pro/index.html" -d /tmp/terapo-sync
cp -r /tmp/terapo-sync/terapo-pro/src/* src/
cp /tmp/terapo-sync/terapo-pro/index.html ./index.html
rm -rf /tmp/terapo-sync
echo "Pronto! Arquivos atualizados."
