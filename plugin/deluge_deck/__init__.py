"""Deluge Deck plugin entry points for Deluge 2.x."""

from importlib.metadata import PackageNotFoundError, version as installed_version

__plugin_name__ = 'Deluge Deck'
try:
    __version__ = installed_version('DelugeDeck')
except PackageNotFoundError:
    # Source checkouts do not have installed package metadata. setup.py reads
    # the canonical package.json version when building the egg.
    __version__ = '0.0.0-dev'
__author__ = 'Deluge Deck contributors'
__author_email__ = ''
__description__ = 'Modern Deluge WebUI with drag-and-drop torrent intake'
__license__ = 'GPL-3.0-or-later'
__url__ = 'https://github.com/deluge-torrent/deluge'

from deluge.plugins.init import PluginInitBase


class CorePlugin(PluginInitBase):
    def __init__(self, plugin_name):
        from .core import Core as _plugin_cls
        self._plugin_cls = _plugin_cls
        super().__init__(plugin_name)


class Gtk3UIPlugin(PluginInitBase):
    def __init__(self, plugin_name):
        from .gtk3ui import Gtk3UI as _plugin_cls
        self._plugin_cls = _plugin_cls
        super().__init__(plugin_name)


class GtkUIPlugin(Gtk3UIPlugin):
    """Legacy GTK entry point used by older Deluge plugin managers."""


class WebUIPlugin(PluginInitBase):
    def __init__(self, plugin_name):
        from .webui import WebUI as _plugin_cls
        self._plugin_cls = _plugin_cls
        super().__init__(plugin_name)
