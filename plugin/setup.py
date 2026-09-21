from pathlib import Path
import json
import os
from setuptools import find_packages, setup


ROOT = Path(__file__).parent
os.chdir(ROOT)
VERSION = json.loads((ROOT.parent / 'package.json').read_text())['version']
setup(
    # Keep this name unhyphenated: Deluge uses the project name as the
    # component namespace shared by the core, GTK, and WebUI managers.
    name='DelugeDeck',
    version=VERSION,
    description='Modern Deluge WebUI with drag-and-drop torrent intake',
    author='Deluge Deck contributors',
    url='https://github.com/deluge-torrent/deluge',
    license='GPL-3.0-or-later',
    packages=find_packages(),
    package_data={'deluge_deck': ['data/*.js', 'data/*.css']},
    include_package_data=True,
    entry_points={
        # Entry-point names must match the egg project name Deluge reports.
        'deluge.plugin.core': ['DelugeDeck = deluge_deck:CorePlugin'],
        'deluge.plugin.gtk3ui': ['DelugeDeck = deluge_deck:Gtk3UIPlugin'],
        'deluge.plugin.gtkui': ['DelugeDeck = deluge_deck:GtkUIPlugin'],
        'deluge.plugin.webui': ['DelugeDeck = deluge_deck:WebUIPlugin'],
        # Older Deluge builds called the WebUI entry-point group ``web``.
        'deluge.plugin.web': ['DelugeDeck = deluge_deck:WebUIPlugin'],
    },
    zip_safe=False,
)
