# Gunakan image Nginx versi ringan (alpine)
FROM nginx:alpine

# Copy custom nginx config jika diperlukan (opsional), jika tidak pakai default
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Hapus default index.html dari Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copy semua file project statis (HTML, CSS, JS, logo, dll) ke direktori web Nginx
COPY . /usr/share/nginx/html/

# Expose port 80 untuk melayani traffic HTTP
EXPOSE 80

# Jalankan Nginx di foreground
CMD ["nginx", "-g", "daemon off;"]
