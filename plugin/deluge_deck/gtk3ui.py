"""GTK3 entry point kept intentionally small for Deluge's plugin loader."""

try:
    from deluge.plugins.pluginbase import Gtk3PluginBase
except ImportError:  # Deluge 1.x / early 2.x compatibility
    from deluge.plugins.pluginbase import GtkPluginBase as Gtk3PluginBase


class Gtk3UI(Gtk3PluginBase):
    def __init__(self, plugin_name):
        super().__init__(plugin_name)

    def enable(self):
        return None

    def disable(self):
        return None
