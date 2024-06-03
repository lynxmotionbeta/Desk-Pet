!/bin/bash
for file in `ls *.{html,css,js,png,gif,svg}`; do
    echo "Compressing: $file"
    cp "$file" "copy_$file" && \
    gzip -f "$file" && \
    mv "copy_$file" "$file"
done
