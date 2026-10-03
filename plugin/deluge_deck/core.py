"""Record aggregate speed history as the existing Deluge service user."""
import logging
import time
from twisted.internet.task import LoopingCall
from deluge import component, configmanager
from deluge.core.rpcserver import export
from deluge.plugins.pluginbase import CorePluginBase
from .speed_history import SpeedHistory

log = logging.getLogger(__name__)


class Core(CorePluginBase):
    def enable(self):
        self.history = SpeedHistory()
        self.history_path = configmanager.get_config_dir('deluge_deck_speed_history.json')
        try:
            self.history.load(self.history_path, int(time.time() * 1000))
        except FileNotFoundError:
            pass
        except (OSError, ValueError, TypeError, AttributeError):
            log.warning('Deluge Deck: ignoring invalid speed history')
        self.sampler = LoopingCall(self._sample)
        self.sampler.start(2, now=False)
        self.saver = LoopingCall(self._save)
        self.saver.start(300, now=False)

    def _sample(self):
        try:
            status = component.get('Core').get_session_status(['payload_download_rate', 'payload_upload_rate'])
            self.history.add(int(time.time() * 1000), status.get('payload_download_rate', 0), status.get('payload_upload_rate', 0))
        except Exception:
            log.debug('Deluge Deck: speed sample unavailable', exc_info=True)

    def _save(self):
        try:
            self.history.save(self.history_path)
        except OSError:
            log.warning('Deluge Deck: unable to save speed history')

    def disable(self):
        for loop in (self.sampler, self.saver):
            if loop.running:
                loop.stop()
        self._save()

    def update(self):
        pass

    @export
    def get_speed_history(self, span=300000, points=600):
        return self.history.query(int(time.time() * 1000), span, points)
