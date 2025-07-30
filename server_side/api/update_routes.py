from flask import Blueprint, jsonify, request, send_file, abort
import os
import json
import datetime
from werkzeug.utils import secure_filename

update_bp = Blueprint('update', __name__)

UPDATES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'updates')
VERSIONS_FILE = os.path.join(UPDATES_DIR, 'versions.json')

os.makedirs(UPDATES_DIR, exist_ok=True)

def load_versions():
    """Load version metadata from versions.json"""
    if os.path.exists(VERSIONS_FILE):
        with open(VERSIONS_FILE, 'r') as f:
            return json.load(f)
    return {'versions': []}

def save_versions(data):
    """Save version metadata to versions.json"""
    with open(VERSIONS_FILE, 'w') as f:
        json.dump(data, f, indent=2)

@update_bp.route('/check', methods=['GET'])
def check_for_updates():
    """Check if updates are available for the given version"""
    current_version = request.args.get('version')
    if not current_version:
        return jsonify({'error': 'Version parameter required'}), 400
    
    versions_data = load_versions()
    versions = versions_data.get('versions', [])
    
    if not versions:
        return jsonify({
            'hasUpdate': False,
            'message': 'No versions available'
        })
    
    # Sort versions by semantic version (assuming x.y.z format)
    def version_key(v):
        try:
            return tuple(map(int, v['version'].split('.')))
        except:
            return (0, 0, 0)
    
    latest_version = max(versions, key=version_key)
    current_version_tuple = version_key({'version': current_version})
    latest_version_tuple = version_key(latest_version)
    
    has_update = latest_version_tuple > current_version_tuple
    
    return jsonify({
        'hasUpdate': has_update,
        'currentVersion': current_version,
        'latestVersion': latest_version['version'] if has_update else current_version,
        'releaseNotes': latest_version.get('releaseNotes', '') if has_update else '',
        'releaseDate': latest_version.get('releaseDate', '') if has_update else '',
        'downloadUrl': f'/api/updates/download/{latest_version["version"]}' if has_update else '',
        'fileSize': latest_version.get('fileSize', 0) if has_update else 0,
        'important': latest_version.get('important', False) if has_update else False,
        'forceUpdate': latest_version.get('forceUpdate', False) if has_update else False
    })

@update_bp.route('/download/<version>', methods=['GET'])
def download_update(version):
    """Download a specific version of the .deb package"""
    versions_data = load_versions()
    versions = versions_data.get('versions', [])
    
    version_info = None
    for v in versions:
        if v['version'] == version:
            version_info = v
            break
    
    if not version_info:
        abort(404, description=f'Version {version} not found')
    
    filename = version_info.get('filename')
    if not filename:
        abort(404, description=f'No file available for version {version}')
    
    file_path = os.path.join(UPDATES_DIR, filename)
    if not os.path.exists(file_path):
        abort(404, description=f'File {filename} not found on server')
    
    return send_file(
        file_path,
        as_attachment=True,
        download_name=filename,
        mimetype='application/vnd.debian.binary-package'
    )

@update_bp.route('/versions', methods=['GET'])
def list_versions():
    """List all available versions"""
    versions_data = load_versions()
    return jsonify(versions_data)

@update_bp.route('/upload', methods=['POST'])
def upload_update():
    """Upload a new .deb package (for admin use)"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not file.filename.endswith('.deb'):
        return jsonify({'error': 'Only .deb files are allowed'}), 400
    
    version = request.form.get('version')
    release_notes = request.form.get('releaseNotes', '')
    important = request.form.get('important', 'false').lower() == 'true'
    force_update = request.form.get('forceUpdate', 'false').lower() == 'true'
    
    if not version:
        return jsonify({'error': 'Version is required'}), 400
    
    filename = secure_filename(file.filename)
    file_path = os.path.join(UPDATES_DIR, filename)
    file.save(file_path)
    
    file_size = os.path.getsize(file_path)
    
    versions_data = load_versions()
    
    # Check if version already exists
    existing_version = None
    for i, v in enumerate(versions_data['versions']):
        if v['version'] == version:
            existing_version = i
            break
    
    version_info = {
        'version': version,
        'filename': filename,
        'releaseNotes': release_notes,
        'releaseDate': datetime.datetime.now().isoformat(),
        'fileSize': file_size,
        'important': important,
        'forceUpdate': force_update
    }
    
    if existing_version is not None:
        versions_data['versions'][existing_version] = version_info
    else:
        versions_data['versions'].append(version_info)
    
    save_versions(versions_data)
    
    return jsonify({
        'message': 'Update uploaded successfully',
        'version': version,
        'filename': filename,
        'fileSize': file_size
    })

@update_bp.route('/delete/<version>', methods=['DELETE'])
def delete_update(version):
    """Delete a specific version from the update system"""
    if not version:
        return jsonify({'error': 'Version parameter required'}), 400
    
    versions_data = load_versions()
    versions = versions_data.get('versions', [])
    
    # Find the version to delete
    version_to_delete = None
    version_index = None
    for i, v in enumerate(versions):
        if v['version'] == version:
            version_to_delete = v
            version_index = i
            break
    
    if not version_to_delete:
        return jsonify({'error': f'Version {version} not found'}), 404
    
    # Delete the file if it exists
    filename = version_to_delete.get('filename')
    if filename:
        file_path = os.path.join(UPDATES_DIR, filename)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                print(f"Deleted file: {file_path}")
            except OSError as e:
                return jsonify({'error': f'Failed to delete file {filename}: {str(e)}'}), 500
    
    # Remove from versions list
    versions_data['versions'].pop(version_index)
    save_versions(versions_data)
    
    return jsonify({
        'message': f'Version {version} deleted successfully',
        'version': version,
        'filename': filename
    })