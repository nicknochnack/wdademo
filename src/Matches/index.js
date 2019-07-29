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

import React from 'react';
import PropTypes from 'prop-types';
import { Container, List, Label, Header, Segment } from 'semantic-ui-react';

/**
 * This object renders the results of the search query on the web page. 
 * Each result item, or 'match', will display a title, description, and
 * sentiment value.
 */

const Match = props => (
  <Segment>
  <List.Item>
    <List.Content>
      <div style={{display: 'flex',justifyContent:'space-between', flexDirection:'column'}}>
      {props.title}
      {props.filename}
      </div>
      {props.filetype}
    </List.Content>
    <List.Content>
    { props.source }
    </List.Content>
    <List.Content>
      <div style={{padding:'5px 0px'}}>
      <List.Description>
        <span dangerouslySetInnerHTML={{__html: props.text}}></span>
      </List.Description>
      </div>
    </List.Content>
    {/* <List.Content>
      Score: { props.score }
    </List.Content> */}
    <List.Description>
      <div style={{display:'flex'}}>
      { props.docCategory }
      {/* { props.date } */}
      { props.author }
      { props.score }
      </div>
    </List.Description>
    {/* <List.Content>
      Sentiment: { props.sentiment }
    </List.Content> */}
  </List.Item>
  </Segment>

);

// type check to ensure we are called correctly
Match.propTypes = {
  title: PropTypes.object.isRequired,
  text: PropTypes.string.isRequired,
  //date: PropTypes.object.isRequired,
  // score: PropTypes.string.isRequired,
  // sentiment: PropTypes.object.isRequired
};

const Matches = props => (
  <div>
    <Container textAlign='left'>
      <div className="matches--list">
        <List divided verticalAlign='middle'>
          {props.matches.map(item =>
            <Match
              key={ item.id }
              title={ getTitle(item.title) }
              filename={ getFileName(item.discFileName)}
              text={ getText(item) }
              highlightText={ item.highlightText }
              author={ getAuthor(item.author) }
              // docCategory = { getDocCategory(item.docCategory) }
              // date={ getDate(item.date) }
              // source= {getSource(item.fileSource, item.filename)}
              // page = {getPage(item.discFileName)}
              filetype={getFileType(item.filetype)}
              score={ getScore(item) }
              // sentiment={ getSentiment(item) }
            />)
          }
        </List>
      </div>
    </Container>
  </div>
);

// type check to ensure we are called correctly
Matches.propTypes = {
  matches: PropTypes.arrayOf(PropTypes.object).isRequired
};

// format title, setting backgroud color for all highlighted words
const getTitle = (title) =>{
  return(<Header as='h2' textAlign={'left'}>{title ? title.replace(/_/g,' ') : 'Unknown Title'}</Header>)
};

const getFileName = (filename) =>{
  return(<Header as='h3' color='grey' textAlign={'left'} style={{marginTop:'0px'}}>{filename ? filename : 'Unknown'}</Header>)
}

// format text, setting background color for all highlighted words.
// Also display only the first 200 characters
const getText = (item) => {
  if (item.highlight.showHighlight && item.highlight.field === 'text') {
    var str = '<style>hilite {background:#ffffb3;}</style>';
    var currIdx = 0;
    if (item.highlight.fullText) {
      str = str + item.highlight.fullText;
    } else {
      item.highlight.indexes.forEach(function(element) {
        str = str + item.text.substring(currIdx, element.startIdx) +
          '<hilite>' +
          item.text.substring(element.startIdx, element.endIdx) +
          '</hilite>';
        currIdx = element.endIdx;
      });
      str = str + item.text.substring(currIdx);
    }
    let concat = str && str !== '' ? str.replace(/\n/g,' ').split(' ',50): [''];
    concat = concat.length >= 50 ? concat.join(' ') + '...' : concat.join(' ')
    return str;
  } else {
    let concat = item.text && item.text !=='' ? item.text.replace(/\n/g,' ').split(' ',50) : ['No Relevant Passages Found...'];
    console.log(concat);
    concat = concat.length >= 50 ? concat.join(' ') + '...' : concat.join(' ')
    return concat
  }
};

// const getDate = (date) =>{
//   var localDate = date ? new Date(date*1000).getFullYear() : 'UNKNOWN';
//   return (<Label color='blue' style={{marginLeft: '5px'}}>Date:<Label.Detail>{localDate}</Label.Detail></Label>)
// }

const getSource = (source, filename) => {
  var sourceLink = source ? `${source}\\${filename}` : ''
  return(<div style={{marginTop:'5px'}}><Container href={'file://///' + sourceLink} target={'_blank'}>{sourceLink}</Container></div>)
}

const getDocCategory = (docCategory) => {
  return(<Label color='blue'>Document Category:<Label.Detail>{docCategory}</Label.Detail></Label>)
}

const getPage = (filename) =>{
  if(filename.match(/page-[0-9]*/)){
    return (<Label attached='top right' color='blue'>Page: {parseInt(filename.match(/page-[0-9]*/)[0].split('-')[1])}</Label>)
  }
  return
}

const getAuthor = (author)=>{
  return (<Label color='grey' style={{marginLeft: '5px'}}>Author:<Label.Detail>{author ? author: 'UNKNOWN'}</Label.Detail></Label>)
}

const getFileType = (filetype)=>{
  return (<Label attached='top right' color='blue'>{filetype ? filetype.toUpperCase() : '-'}</Label>)
}

/**
 * getScore - round up to 4 decimal places.
 */
const getScore = item => {
  var score = 0.0;
  score = item.score ? (item.score).toFixed(4) : 0.00
  return (<Label color='grey' style={{marginLeft: '5px'}}>Relevance Score:<Label.Detail>{score}</Label.Detail></Label>)
};

/**
 * getSentiment - determine which icon to display to represent
 * positive, negative, and neutral sentiment.
 */
// const getSentiment = item => {
//   var score = Number(item.sentimentScore).toFixed(2);
//   var color = 'grey';
//   switch (item.sentimentLabel) {
//   case 'negative': 
//     color='red';
//     break;
//   case 'positive': 
//     color='green';
//     break;
//   }

//   return <Label 
//     className='sentiment-value' 
//     as='a'
//     color={ color }
//     size='tiny' 
//     tag>{ score  }</Label>;  
// };

// export so we are visible to parent
module.exports = Matches;
