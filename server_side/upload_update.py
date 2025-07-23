#!/usr/bin/env python3
"""
Script to upload .deb packages to the SmartTV update server.
Usage: python upload_update.py <deb_file> <version> [release_notes]
"""

import sys
import os
import requests
import argparse

def upload_update(server_url, deb_file, version, release_notes=""):
    """Upload a .deb package to the update server"""
    
    if not os.path.exists(deb_file):
        print(f"Error: File {deb_file} not found")
        return False
    
    if not deb_file.endswith('.deb'):
        print("Error: File must be a .deb package")
        return False
    
    upload_url = f"{server_url}/api/updates/upload"
    
    try:
        with open(deb_file, 'rb') as f:
            files = {'file': (os.path.basename(deb_file), f, 'application/vnd.debian.binary-package')}
            data = {
                'version': version,
                'releaseNotes': release_notes
            }
            
            print(f"Uploading {deb_file} as version {version}...")
            response = requests.post(upload_url, files=files, data=data)
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Upload successful!")
                print(f"   Version: {result['version']}")
                print(f"   Filename: {result['filename']}")
                print(f"   File size: {result['fileSize']} bytes")
                return True
            else:
                print(f"❌ Upload failed: {response.status_code}")
                try:
                    error_info = response.json()
                    print(f"   Error: {error_info.get('error', 'Unknown error')}")
                except:
                    print(f"   Response: {response.text}")
                return False
                
    except requests.exceptions.ConnectionError:
        print(f"❌ Could not connect to server at {server_url}")
        print("   Make sure the Flask server is running")
        return False
    except Exception as e:
        print(f"❌ Upload failed: {str(e)}")
        return False

def list_versions(server_url):
    """List all available versions on the server"""
    try:
        response = requests.get(f"{server_url}/api/updates/versions")
        if response.status_code == 200:
            data = response.json()
            versions = data.get('versions', [])
            
            if not versions:
                print("No versions available on server")
                return
                
            print("Available versions:")
            for version in sorted(versions, key=lambda x: x['version'], reverse=True):
                print(f"  v{version['version']} - {version['filename']} ({version['fileSize']} bytes)")
                if version.get('releaseDate'):
                    print(f"    Released: {version['releaseDate']}")
                if version.get('releaseNotes'):
                    print(f"    Notes: {version['releaseNotes']}")
                print()
        else:
            print(f"Failed to fetch versions: {response.status_code}")
    except Exception as e:
        print(f"Error listing versions: {str(e)}")

def delete_version(server_url, version):
    """Delete a version from the update server"""
    try:
        delete_url = f"{server_url}/api/updates/delete/{version}"
        print(f"Deleting version {version}...")
        
        response = requests.delete(delete_url)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Version deleted successfully!")
            print(f"   Version: {result['version']}")
            print(f"   Filename: {result['filename']}")
            return True
        else:
            print(f"❌ Delete failed: {response.status_code}")
            try:
                error_info = response.json()
                print(f"   Error: {error_info.get('error', 'Unknown error')}")
            except:
                print(f"   Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"❌ Could not connect to server at {server_url}")
        print("   Make sure the Flask server is running")
        return False
    except Exception as e:
        print(f"❌ Delete failed: {str(e)}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Upload .deb packages to SmartTV update server')
    parser.add_argument('--server', default='http://localhost:3001', 
                       help='Server URL (default: http://localhost:3001)')
    parser.add_argument('--list', action='store_true', 
                       help='List all available versions')
    parser.add_argument('--delete', metavar='VERSION',
                       help='Delete a specific version from the server')
    parser.add_argument('deb_file', nargs='?', 
                       help='Path to .deb file to upload')
    parser.add_argument('version', nargs='?', 
                       help='Version string (e.g., 1.2.0)')
    parser.add_argument('release_notes', nargs='?', default='', 
                       help='Release notes (optional)')
    
    args = parser.parse_args()
    
    if args.list:
        list_versions(args.server)
        return
    
    if args.delete:
        success = delete_version(args.server, args.delete)
        sys.exit(0 if success else 1)
    
    if not args.deb_file or not args.version:
        parser.print_help()
        print("\nExamples:")
        print("  python upload_update.py smart-tv-ui_1.1.0_amd64.deb 1.1.0 'Bug fixes and improvements'")
        print("  python upload_update.py --list")
        print("  python upload_update.py --delete 1.0.0")
        print("  python upload_update.py --server http://192.168.1.100:3001 app.deb 1.2.0")
        return
    
    success = upload_update(args.server, args.deb_file, args.version, args.release_notes)
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()