# fluentui-app

`fluentui-app` is a [Create React App](https://github.com/facebook/create-react-app) that comes with Fluent UI 
pre-installed, and serves as an example of how to use `flamegrill` as a standalone tool for performance measurements.

## How to generate flamegraph for the app

`fluentui-app` is a standard CRA app with an artificial bottleneck added to it so that it is better visible in the
generated flamegraphs using the `flamegrill` tool. You should note that this example serves as a general example of how
to use `flamegrill` with any CRA app and not specifically FluentUI.

The bootleneck is called `InefficientComponent`. It is a dummy component that performs a lot pointless work, and is   
defined in the `src/App.tsx` as follows

```tsx
const InefficientComponent: React.FunctionComponent = (props) => {
  for (let i = 0; i < 100; i++) {
    console.log(i);
  }
  return <div>{props.children}</div>;
}
```

We then wrap the logo image inside of it

```tsx
export const App: React.FunctionComponent = () => {
  return
    // ...
    <InefficientComponent>
      <img src={logo} alt="logo" />
    </InefficientComponent>;
}
```

In order to generate the flamegraphs for the app, we need to build the app for production. Normally, we'd simply
run `yarn build` which is an alias for `react-scripts build`, which in turn, under-the-hood calls `webpack` to
optimize and minify the app. However, for the flamegraphs to be readable and meaningful, we need to disable the
minification. While `react-scripts` don't allow us to tweak the `webpack` out of the box, it is possible via
`react-app-rewired` package. With `react-app-rewired` added as a dev dependency, we can tell it to override certain
configuration values of `webpack` such as turning minification off for the production build. You can explore this
further in `config-overrides.js` file.

If you build the for production using

```
yarn build
```

this will put the production build of the app in the `build` directory. 

Next, create `perf` directory where we'll store generated performance flamegraphs and logs, and run
`flamegrill` out of with pointing at the generated `build/index.html`.

```
yarn flamegrill -n AppTest -s file:///path/to/my/app/build/index.html
```

This will generate flamegraphs in the `perf` directory which can then be previewed using your favourite browser.

