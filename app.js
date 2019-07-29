/**
 * Copyright 2017 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License'); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

const express = require('express');
const app = express();
const path = require('path');
const dotenv = require('dotenv').config;
const cfenv = require('cfenv')
const appEnv = cfenv.getAppEnv();
const routes = require('./server/routes');
const fs = require('fs');
const browserify = require('browserify');
const ipRangeCheck = require('ip-range-check');
const reactViews = require('express-react-views');

app.set('views', path.join(__dirname, 'src'));
app.set('view engine', 'js');
app.engine('js', reactViews.createEngine());

const port = process.env.PORT || appEnv.port || 3000;

browserify(path.join(__dirname, '/public/js/bundle.js'), {extension: ['js']}).transform('babelify').transform('envify').transform('uglifyify',{global: true})
.bundle((err,buff)=>{
  console.log('bundling main...');
  fs.writeFileSync('./public/js/bundle.min.js',buff),{encoding:'utf8'}
  console.log('completed bundling, filesize:',buff.length);

})

browserify(path.join(__dirname, '/public/js/home.js'), {extension: ['js']}).transform('babelify').transform('envify').transform('uglifyify',{global: true})
.bundle((err,buff)=>{
  console.log('bundling home...');
  fs.writeFileSync('./public/js/home.min.js',buff),{encoding:'utf8'}
  console.log('completed bundling, filesize:', buff.length);
})


app.use(express.static(path.join(__dirname, 'public/')));
if(process.env.HOST_ENV !== 'dev'){
  app.use(e);
}
app.use('/', routes);

app.listen(port,() => {
      // eslint-disable-next-line no-console
      console.log('Watson Discovery UI Server running on port: %d', port);
})

function e(req,res,next){
  if (req.headers && req.headers.$wssp === "80") {
    return res.redirect('https://'+ req.get('host') + req.url);
  }
  next(); 
}
