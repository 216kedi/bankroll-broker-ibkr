#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MySQL Web Query Interface - Flask Backend
Bu uygulama MySQL veritabanı tablolarını web üzerinden sorgulamak için kullanılır.
"""

import os
import csv
import io
from flask import Flask, render_template, jsonify, request, send_file
from flask_cors import CORS
import pymysql
from pymysql.cursors import DictCursor
from dotenv import load_dotenv
import logging

# .env dosyasını yükle
load_dotenv()

# Flask uygulamasını oluştur
app = Flask(__name__)
CORS(app)

# Logging ayarları
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Veritabanı bağlantı ayarları
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_DATABASE', 'tapu'),
    'charset': 'utf8mb4',
    'cursorclass': DictCursor
}


def get_db_connection():
    """Veritabanı bağlantısı oluştur"""
    try:
        connection = pymysql.connect(**DB_CONFIG)
        return connection
    except Exception as e:
        logger.error(f"Veritabanı bağlantı hatası: {str(e)}")
        raise


@app.route('/')
def index():
    """Ana sayfa"""
    return render_template('index.html')


@app.route('/api/tables', methods=['GET'])
def get_tables():
    """Veritabanındaki tüm tabloları listele"""
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("SHOW TABLES")
            tables = [list(row.values())[0] for row in cursor.fetchall()]
        connection.close()

        return jsonify({
            'success': True,
            'tables': tables
        })
    except Exception as e:
        logger.error(f"Tablolar alınırken hata: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/table/<table_name>', methods=['GET'])
def get_table_data(table_name):
    """
    Seçilen tablonun verilerini sayfalama ile getir
    Query parametreleri:
    - page: Sayfa numarası (default: 1)
    - per_page: Sayfa başına kayıt sayısı (default: 100)
    - sort_by: Sıralama yapılacak sütun
    - sort_order: Sıralama yönü (asc/desc)
    - search: Arama terimi
    """
    try:
        # Parametreleri al
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 100))
        sort_by = request.args.get('sort_by', '')
        sort_order = request.args.get('sort_order', 'asc')
        search_term = request.args.get('search', '')

        # Güvenlik kontrolü - tablo adını sanitize et
        # Sadece alfanumerik ve alt çizgi karakterlerine izin ver
        if not table_name.replace('_', '').isalnum():
            return jsonify({
                'success': False,
                'error': 'Geçersiz tablo adı'
            }), 400

        connection = get_db_connection()

        with connection.cursor() as cursor:
            # Sütun bilgilerini al
            cursor.execute(f"SHOW COLUMNS FROM `{table_name}`")
            columns_info = cursor.fetchall()
            columns = [col['Field'] for col in columns_info]

            # Arama sorgusu oluştur
            where_clause = ""
            search_params = []
            if search_term:
                # Tüm sütunlarda arama yap
                search_conditions = []
                for col in columns:
                    search_conditions.append(f"`{col}` LIKE %s")
                    search_params.append(f"%{search_term}%")
                where_clause = " WHERE " + " OR ".join(search_conditions)

            # Toplam kayıt sayısını al
            count_query = f"SELECT COUNT(*) as total FROM `{table_name}`{where_clause}"
            if search_params:
                cursor.execute(count_query, search_params)
            else:
                cursor.execute(count_query)
            total_records = cursor.fetchone()['total']

            # Sıralama kontrolü
            order_clause = ""
            if sort_by and sort_by in columns:
                order_direction = "DESC" if sort_order.lower() == 'desc' else "ASC"
                order_clause = f" ORDER BY `{sort_by}` {order_direction}"

            # Sayfalama hesapla
            offset = (page - 1) * per_page

            # Veri sorgusunu oluştur
            data_query = f"SELECT * FROM `{table_name}`{where_clause}{order_clause} LIMIT %s OFFSET %s"
            query_params = search_params + [per_page, offset]

            cursor.execute(data_query, query_params)
            rows = cursor.fetchall()

        connection.close()

        # Sayfa bilgilerini hesapla
        total_pages = (total_records + per_page - 1) // per_page

        return jsonify({
            'success': True,
            'columns': columns,
            'rows': rows,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total_records': total_records,
                'total_pages': total_pages,
                'has_prev': page > 1,
                'has_next': page < total_pages
            }
        })

    except Exception as e:
        logger.error(f"Tablo verileri alınırken hata: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/export/<table_name>', methods=['GET'])
def export_table(table_name):
    """Tablonun tüm verilerini CSV olarak dışa aktar"""
    try:
        # Güvenlik kontrolü - tablo adını sanitize et
        if not table_name.replace('_', '').isalnum():
            return jsonify({
                'success': False,
                'error': 'Geçersiz tablo adı'
            }), 400

        # Arama terimi varsa filtrele
        search_term = request.args.get('search', '')

        connection = get_db_connection()

        with connection.cursor() as cursor:
            # Sütun bilgilerini al
            cursor.execute(f"SHOW COLUMNS FROM `{table_name}`")
            columns_info = cursor.fetchall()
            columns = [col['Field'] for col in columns_info]

            # Arama sorgusu oluştur
            where_clause = ""
            search_params = []
            if search_term:
                search_conditions = []
                for col in columns:
                    search_conditions.append(f"`{col}` LIKE %s")
                    search_params.append(f"%{search_term}%")
                where_clause = " WHERE " + " OR ".join(search_conditions)

            # Tüm verileri çek
            query = f"SELECT * FROM `{table_name}`{where_clause}"
            if search_params:
                cursor.execute(query, search_params)
            else:
                cursor.execute(query)
            rows = cursor.fetchall()

        connection.close()

        # CSV dosyası oluştur
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)

        # CSV'yi bytes'a çevir
        output.seek(0)
        csv_bytes = io.BytesIO()
        csv_bytes.write(output.getvalue().encode('utf-8-sig'))  # UTF-8 BOM ile Excel uyumluluğu
        csv_bytes.seek(0)

        # Dosya adını oluştur
        filename = f"{table_name}_export.csv"

        return send_file(
            csv_bytes,
            mimetype='text/csv',
            as_attachment=True,
            download_name=filename
        )

    except Exception as e:
        logger.error(f"CSV export hatası: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """Uygulama ve veritabanı sağlık kontrolü"""
    try:
        connection = get_db_connection()
        connection.close()
        return jsonify({
            'success': True,
            'status': 'healthy',
            'database': 'connected'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'status': 'unhealthy',
            'error': str(e)
        }), 500


if __name__ == '__main__':
    # Geliştirme ortamı için
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('DEBUG', 'True').lower() == 'true'

    logger.info(f"Uygulama başlatılıyor: http://localhost:{port}")
    logger.info(f"Veritabanı: {DB_CONFIG['database']}")

    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )
