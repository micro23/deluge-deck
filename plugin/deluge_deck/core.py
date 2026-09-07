"""Core-side marker plugin.

The actual torrent operations remain Deluge core RPC calls. This lightweight
core entry makes Deluge Deck installable and visible in the GTK Preferences
Plugins list without modifying daemon behavior.
"""

from deluge.plugins.pluginbase import CorePluginBase


class Core(CorePluginBase):
    def __init__(self, plugin_name):
        super().__init__(plugin_name)

    def enable(self):
        """Keep a registered core component for Deluge's plugin lifecycle."""
        return None

    def disable(self):
        return None

    def update(self):
        return None
