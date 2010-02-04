/**
 * MIME type mappings
 *
 * Example program:
 *   sys = require("sys")
 *   mimetypes = require("mimetypes")
 *   query = process.ARGV[0] || "json"
 *   result = mimetypes.lookup(query)
 *   sys.p(result)
 *
 * Example output:
 *   $ node example.js yml
 *   "text/yaml"
 *   $ node example.js video/mp4
 *   ["mp4", "mp4v", "mpg4", "m4v"]
 *
 */

// known system mime.types file locations
exports.knownfiles = [
	"/etc/mime.types",
	"/etc/apache2/mime.types",              // Apache 2
	"/etc/apache/mime.types",               // Apache 1
	"/etc/httpd/mime.types",                // Mac OS X <=10.5
	"/etc/httpd/conf/mime.types",           // Apache
	"/usr/local/etc/httpd/conf/mime.types",
	"/usr/local/lib/netscape/mime.types",
	"/usr/local/etc/httpd/conf/mime.types", // Apache 1.2
	"/usr/local/etc/mime.types"            // Apache 1.3
]
	
// a few common types "built-in"
types = exports.types = {
	"css": "text/css",
	"flv": "video/x-flv",
	"gif": "image/gif",
	"gz": "application/x-gzip",
	"html": "text/html",
	"ico": "image/vnd.microsoft.icon",
	"jpg": "image/jpeg",
	"js": "application/javascript",
	"json": "application/json",
	"mp4": "video/mp4",
	"ogg": "application/ogg",
	"pdf": "application/pdf",
	"png": "image/png",
	"svg": "image/svg+xml",
	"tar": "application/x-tar",
	"tbz": "application/x-bzip-compressed-tar",
	"txt": "text/plain",
	"xml": "application/xml",
	"yml": "text/yaml",
	"zip": "application/zip"
}

/**
 * Parse and import data in the mime.types format
 */
function parse(data) {
	data.split(/[\r\n]+/).forEach(function(line){
		line = line.trim()
		if (line.charAt(0) === '#')
			return
		words = line.split(/\s+/)
		if (words.length < 2)
			return
		type = words.shift().toLowerCase()
		words.forEach(function(suffix) {
			types[suffix.toLowerCase()] = type
		})
	})
}
exports.parse = parse

/**
 * Read and import types from system types.
 *
 * This is done automatically by the first call to lookup(), but since lookup
 * is designed to be deterministic (i.e. give the same results for every same
 * lookup over time) the implied and lazy importing of system types is
 * blocking. If you wish to avoid the one-time blocking call to lookup() you
 * can call this function without an argument before you issue any calls to
 * lookup().
 *
 * Example:
 *   mimetypes.readSystemTypes().addCallback(function(path){
 *     sys.puts('imported system mime types from '+path)
 *     type = mimetypes.lookup('yaml')
 *     sys.puts("mimetypes.lookup('yaml') => "+type)
 *   }).addErrback(function(error){
 *     if (error)
 *       sys.error('failed to import system mime types: '+error)
 *     else
 *       sys.puts('no system mime types could be found')
 *   })
 *
 * It's recommended you do not care about this and instead let lookup() take
 * care of this.
 *
 * Takes a rich-evaluated boolean
 * Returns a process.Promise
 */
function readSystemTypes(sync) {
	promise = _parseSystemTypes(exports.knownfiles)
	if (sync) {
		try {
			promise.wait()
		} catch(e){}
	}
	else {
		return promise
	}
	// no need for this anymore, also used to mark "we've done it"
	delete exports.knownfiles
}
exports.readSystemTypes = readSystemTypes

/**
 * Look up mime type for a filename extension, or look up 
 * list of filename extension for a mime type.
 *
 * Returns a string if <extOrType> is an extension (does not 
 * contain a "/"), otherwise a list of strings is returned.
 *
 * For compatibility with path.extname(), a filename extension
 * is allowed to include the "." prefix (which will be stripped).
 *
 * Example:
 *   mimetypes.lookup('yml') => "text/yaml"
 *   mimetypes.lookup('text/yaml') => ["yml", "yaml"]
 */
function lookup(extOrType) {
	// lazy importing of system mime types
	if (exports.knownfiles !== undefined) {
		// do this synchronously by default, since we want to avoid first
		// lookup to yield different results from following lookups
		readSystemTypes(true)
	}
	// look up type based on extension, or extension based on type
	extOrType = extOrType.toLowerCase()
	if (extOrType.indexOf('/') === -1) {
		if (extOrType.charAt(0) === '.')
			extOrType = extOrType.substr(1)
		return types[extOrType]
	}
	else {
		exts = []
		for (var k in types) {
			if (types[k] === extOrType)
				exts.push(k)
		}
		return exts
	}
}
exports.lookup = lookup

// -----------------
// internals

_parseSystemTypes = function(paths) {
	promise = new process.Promise()
	var next = function(){
		path = paths.shift()
		if (!path) {
			promise.emitError()
			return
		}
		posix.cat(path).addCallback(function (content) {
			parse(content)
			promise.emitSuccess(path)
		}).addErrback(function(){
			next()
		});
	}
	next()
	return promise
}

