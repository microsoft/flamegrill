import { graphql } from 'gatsby';
import React from 'react';
import Helmet from 'react-helmet';
import styled from 'styled-components';

import config from '../../data/SiteConfig';
import CtaButton from '../components/CtaButton';
import Navigation from '../components/Layout/Navigation';
import Layout from '../layouts';
import logoSvg from '../assets/bbq.svg';

const Index = props => {
  return (
    <Layout location={props.location}>
      <IndexContainer>
        <Helmet title={config.siteTitle} />

        <IndexHeadContainer>
          <Navigation />
          <Hero>
            <LogoRow>
              <Logo src={logoSvg} />
              <h1>{config.siteTitle}</h1>
            </LogoRow>
            <h4>{config.siteDescription}</h4>
            <CtaButton to={'/getting-started'}>Getting Started</CtaButton>
          </Hero>
        </IndexHeadContainer>
        <FooterContainer>
          <div className="contributors">
            <div>
              Icons made by{' '}
              <a href="https://www.flaticon.com/authors/flat-icons" title="Flat Icons">
                Flat Icons
              </a>{' '}
              from{' '}
              <a href="https://www.flaticon.com/" title="Flaticon">
                www.flaticon.com
              </a>
            </div>
          </div>
        </FooterContainer>
      </IndexContainer>
    </Layout>
  );
};

export default Index;

const IndexContainer = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
`;

const LogoRow = styled.div`
  display: flex;
  margin: 0 auto;
  align-items: center;
  justify-content: center;
`;

const Logo = styled.img`
  height: 40px;
  width: 40px;
  margin-right: 5px;
`;

const IndexHeadContainer = styled.div`
  background: ${props => props.theme.brand};
  padding: ${props => props.theme.sitePadding};
  text-align: center;
`;

const Hero = styled.div`
  padding: 50px 0;
  & h1 {
    font-weight: 600;
    margin: 0;
    padding: 0;
    line-height: 60px;
  }
`;

const FooterContainer = styled.footer`
  background: ${props => props.theme.lightGrey};

  height: 100px;

  padding-top: 30px;
  display: flex;
  justify-content: center;
  & a {
    font-size: 1rem;
  }
`;

export const query = graphql`
  query IndexQuery {
    allMarkdown: allMarkdownRemark(limit: 2000, sort: { order: ASC, fields: [fields___slug] }) {
      edges {
        node {
          fields {
            slug
          }
          excerpt
          frontmatter {
            title
          }
        }
      }
    }
  }
`;
