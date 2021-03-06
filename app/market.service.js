var truffleContract = require("truffle-contract");
var marketJson = require("../build/contracts/Market.json");
var erc20Json = require("../build/contracts/ERC20.json");
var Market = truffleContract(marketJson);
var ERC20 = truffleContract(erc20Json);
var Promise = require("bluebird");

module.exports = ['$rootScope', '$timeout', function ($rootScope, $timeout) {
    Market.setProvider(web3.currentProvider);
    ERC20.setProvider(web3.currentProvider);
    $rootScope.ERC20 = ERC20;
    function mapProduct(array) {
        return {
            amount: array[0].toNumber(),
            price: array[1],
            name: web3.toAscii(array[2]),
            seller: array[3],
            token:array[4]
        }

    };
    async function getProducts(instance){
        var count = await instance.getProductsCount();
        var products = [];
        for(var i = 0;i<count;i++){
            var id = await instance.productIds(i);
            var product = mapProduct(await instance.products(id));
            product.id = id;
            products.push(product);
        }
        return products;
    };
    async function getAllowedTokens(instance,account){
        var count = (await instance.getAllowedTokensCount()).toNumber();
        var tokens = [];
        for(var i = 0;i<count;i++){
            var token = {};
            token.address = await instance.getAllowedTokenAt(i);
            tokens.push(token);
        }
        tokens = await Promise.all(tokens.map(async token=>{
            token.instance = await ERC20.at(token.address);
            token.name = await token.instance.name();
            token.totalSupply = await token.instance.totalSupply();
            token.balance = (await token.instance.balanceOf(account)).toNumber();
            token.marketBalance = (await instance.tokenBalances(token.address,account)).toNumber();
            token.decimalUnits = (await token.instance.decimals()).toNumber();
            token.symbol = await token.instance.symbol();
            return token;
        }));
        return tokens;
    };
    return {
        getContract:function(){return Market;},
        getProducts:getProducts,
        getProductsWithTokens:async function(instance,account){
            var results = await Promise.all([getProducts(instance),getAllowedTokens(instance, account)]);
            var products = results[0];
            var tokens = results[1];
            products = products.map(product => {
                product.token = tokens.filter(token => token.instance.address == product.token)[0];
                product.priceToShow = product.token? (product.price/(Math.pow(10,product.token.decimalUnits))): web3.fromWei(product.price, 'ether');
                return product;
            });
            return products;
        },
        getProduct:function(instance,index){
            return instance.products(index).then((array) => {
                return Promise.resolve(mapProduct(array));
            })
        },
        getAllowedTokens:getAllowedTokens
    };
}];    