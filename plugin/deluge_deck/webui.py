"""Inject the compiled Deluge Deck SPA into Deluge WebUI."""

from deluge.plugins.pluginbase import WebPluginBase
import pkg_resources

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
    # The style script supplies artwork variables and all rules synchronously.
    # Hosts that also register stylesheets reuse those variables here.
    stylesheets = [resource(f'deluge-deck-{__version__}.css')]
    debug_stylesheets = stylesheets
