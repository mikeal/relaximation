import subprocess
import tempfile
import os
import uuid
import sys
from optparse import OptionParser

class SubprocessCommand(object):
    def __init__(self, **options):
        self.options = options
        self.results = []
    def run(self, cmd):
        print cmd
        result = subprocess.call(cmd, **self.options)
        assert not result
        self.results.append(result)

class Builder(object):
    def __init__(self, url, ref=None, working_directory=None):
        self.url = url
        self.ref = ref
        if working_directory is None:
            working_directory = tempfile.mkdtemp(suffix='.couchconfig')
        self.working_directory = os.path.abspath(working_directory)
        if not os.path.isdir(self.working_directory):
            os.mkdir(self.working_directory)
    
    build_commands = {'darwin':[
                        ['./bootstrap'],
                        ['./configure','--with-js-include=/usr/local/spidermonkey/include', 
                         '--with-js-lib=/usr/local/spidermonkey/lib'],
                        ['make'],
                        ['make dev']
                        ]
                    }
        
    def getandbuild(self):
        dirid = str(uuid.uuid1()).replace('-','')
        SubprocessCommand(cwd=self.working_directory).run(['git', 'clone', self.url, dirid])
        scmd = SubprocessCommand(cwd=os.path.join(self.working_directory, dirid), shell=True)
        if self.ref:
            scmd.run(['git', 'checkout', self.ref])
        for command in self.build_commands[sys.platform]:
            scmd.run(command)
    

if __name__ == "__main__":
    parser = OptionParser()
    parser.add_option("-u", "--url", dest="url", help="URL to git repository")
    parser.add_option("-d", "--dir", dest="dir", help="Working directory", default=None)
    parser.add_option("-r", "--ref", dest="ref", help="Git ref to branch or commit hash.")
    (options, args) = parser.parse_args()
    
    b = Builder(options.url, working_directory=options.dir)
    b.getandbuild()
        
        
        

