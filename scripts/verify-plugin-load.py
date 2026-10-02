"""Load one source-only egg using Deluge's cross-version discovery settings.

Real Deluge plugin base classes are used with isolated RPC registrars; this
checks plugin loading and resources without connecting to a daemon or GTK.
"""

import gc
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import zipfile


def main():
    root = Path(__file__).resolve().parent.parent
    version = json.loads((root / 'package.json').read_text())['version']
    eggs = list((root / 'plugin/dist').glob('*.egg'))
    assert len(eggs) == 1, f'Expected one egg, found {eggs}'
    egg_path = eggs[0]
    digest, name = Path(str(egg_path) + '.sha256').read_text().split()
    assert name == egg_path.name
    assert hashlib.sha256(egg_path.read_bytes()).hexdigest() == digest
    with zipfile.ZipFile(egg_path) as archive:
        assert archive.testzip() is None
        assert not any(name.endswith(('.pyc', '.pyo', '.so', '.pyd', '.dll', '.dylib'))
                       for name in archive.namelist()), 'Egg must contain source only'
        for name in archive.namelist():
            if name.endswith('.py'):
                compile(archive.read(name), name, 'exec')

    with tempfile.TemporaryDirectory(prefix='deluge-deck-load-') as cache:
        os.environ['PYTHON_EGG_CACHE'] = cache
        import pkg_resources
        import deluge.component as component

        # These are the discovery settings used by Deluge 2's plugin manager.
        environment = pkg_resources.Environment(
            [str(egg_path.parent)], platform=None, python=None)
        distribution = environment['DelugeDeck'][0]
        assert distribution.version == version
        distribution.activate()

        class Registrar(component.Component):
            def __init__(self, name):
                super().__init__(name)
                self.objects = {}

            def register_object(self, obj, name):
                self.objects[name] = obj

            def deregister_object(self, obj):
                self.objects = {name: value for name, value in self.objects.items()
                                if value is not obj}

        # The plugin only needs these two services during construction.
        rpc = Registrar('RPCServer')
        json_rpc = Registrar('JSON')
        groups = ['core', 'gtk3ui', 'gtkui', 'webui', 'web']
        for group in groups:
            entry_group = 'deluge.plugin.' + group
            wrapper = distribution.load_entry_point(entry_group, 'DelugeDeck')
            instance = wrapper('DelugeDeck')
            assert instance.plugin.__class__.__module__.startswith('deluge_deck.')
            instance.enable()
            if group in ('webui', 'web'):
                resources = instance.plugin.scripts + instance.plugin.stylesheets
                assert len(resources) == 4
                for resource in resources:
                    assert Path(resource).is_file() and Path(resource).stat().st_size > 0
                    assert f'deluge-deck-{version}' in Path(resource).name
            instance.disable()
            rpc.deregister_object(instance.plugin)
            json_rpc.deregister_object(instance.plugin)
            component.deregister(instance.plugin)
            del instance
            gc.collect()
        # Keep registrars alive until all plugin destructors have run.
        component.deregister(rpc)
        component.deregister(json_rpc)
    print(f'{egg_path.name}: all five entry points and WebUI resources loaded '
          f'on Python {sys.version.split()[0]}')


if __name__ == '__main__':
    main()
