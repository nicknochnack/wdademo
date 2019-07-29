import React from 'react';
import { Input, Header, Image } from 'semantic-ui-react';
import ReactDOM from 'react-dom';

class HomePage extends React.Component{
	render(){
		return(
			<html>
			<head>
			  <title>Data and AI RFI Helper</title>
			  <meta charSet="utf-8" />
			  <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
			  <meta name="viewport" content="width=device-width, initial-scale=1" />
			  <meta name="og:title" content="Watson Discovery Search UI" />
			  <meta name="og:description" content={this.props.description || 'Search using Watson Discovery Service'} />
			  <link rel="stylesheet" type="text/css" href="css/application.css"/>
			  <link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.2.12/semantic.min.css"/>
			  <link rel="icon" type="image/x-icon" href="/images/favicon.ico"/>
			</head>
			<body>
				<div id="home"></div>
				<script type="text/javascript" src="js/home.min.js" />
			</body>
		  </html>)
	}
}

module.exports = HomePage;