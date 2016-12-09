#!/usr/bin/env node

const spawn = require('child_process').spawn
const fs = require('fs')
const path = require('path')
const TaskPool = require('./task-pool.js')
const Aria2 = require('aria2')

var config = JSON.parse(fs.readFileSync(path.join(__dirname,'conf.json'), 'utf8'))

var aria2 = new Aria2(config.aria2)

const dropbox = config.dropboxUploaderPath
const download_path = config.aria2DownloadPath

// Only 4 running dropboxuploader.sh are allowed
var pool = new TaskPool(4)

var dropboxUpload = (files) => {
  return new Promise((resolve, reject) => {
    let path = files[0]['path']
    if(files.length > 1) {
      let p = path.indexOf('/', download_path.length + 1)
      path = path.substring(0, p)
    }
    const fname = path.substring(path.lastIndexOf('/') + 1)
    const ext = fname.substring(fname.indexOf('.') + 1)
    if (files.length > 1 || (/\[METADATA\].*/.exec(fname) == null && /.*(torrent|html).*/.exec(ext) == null)) {
      console.log('Uploading ' + fname + ' to dropbox...')
      let output = ''
      const dupload = spawn(dropbox, ['upload', path, '/'])
      dupload.stdout.on('data', (data) => {
        output += data
      })
      dupload.on('error', (err) => {
        reject(err)
      })
      dupload.on('close', (code) => {
        if (code == 0) {
          output += (`\nDropbox upload ${path} successfully`)
          const rm = spawn('rm', ['-r',  path])
          rm.on('close', (code) => {
            if (code == 0) {
              output += `\nrm ${path} successfully`
              resolve(output)
            } else {
              reject(`rm ${path} failed with code: ${code}`)
            }
          })
        } else {
          reject(`Dropbox upload "${path}" exit with ${code}`)
        }
      })
    }
  })
}

aria2.onDownloadComplete = ({
  gid
}) => {
  console.log(gid)
  aria2.getFiles(gid).then((files) => {
    pool.apply(dropboxUpload, files)
  }).catch((err) => {
    console.log(err)
  })
}

aria2.open().then(() => {
  console.log('Aria2 connected...')
}).catch((err) => {
  console.log(err)
})
