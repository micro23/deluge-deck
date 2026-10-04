"""Inject the compiled Deluge Deck SPA into Deluge WebUI."""

from deluge.plugins.pluginbase import WebPluginBase
import pkg_resources
from deluge import component
from twisted.web.static import File

from . import __version__


def resource(filename):
    return pkg_resources.resource_filename('deluge_deck', f'data/{filename}')


class WebUI(WebPluginBase):
    # Deluge receives this dependency order. The app also listens for the
    # bootstrap-ready event because browsers may complete injected scripts out
    # of order when a hosted page is already busy.
    scripts = [
        resource(f'deluge-deck-{__version__}-style.js'),
        resource(f'deluge-deck-{__version__}-plugin.js'),
        resource(f'deluge-deck-{__version__}.js'),
    ]
    debug_scripts = scripts
    # Shared styles load synchronously; the selected theme and its artwork
    # are requested on demand from the static resource directory.
    # Keep the legacy optional stylesheet registration as a harmless stub.
    stylesheets = [resource(f'deluge-deck-{__version__}.css')]
    debug_stylesheets = stylesheets

    def enable(self):
        self._resource_parent = component.get('DelugeWeb').top_level
        self._theme_resources = File(resource('resources'))
        self._resource_parent.putChild(b'deluge-deck-resources', self._theme_resources)

    def disable(self):
        parent = getattr(self, '_resource_parent', None)
        if parent and parent.children.get(b'deluge-deck-resources') is getattr(self, '_theme_resources', None):
            del parent.children[b'deluge-deck-resources']
