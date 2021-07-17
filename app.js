var ex=require("express");
var app=ex();
var mongoose=require("mongoose");
var bp=require("body-parser");
var passport=require('passport');
var flash=require('connect-flash');
var passportlocalmongoose=require('passport-local-mongoose');
var localstrategy=require('passport-local');
app.use(bp.urlencoded({ extended: true }));
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
app.set("view engine","ejs");

mongoose.connect('mongodb://localhost/campg',{useNewUrlParser:true,useUnifiedTopology:true,useCreateIndex:true});
//mongodb+srv://sai:sai@cluster0-d0obj.mongodb.net/test?retryWrites=true&w=majority

app.use(flash());
var User = new mongoose.Schema({
  username: String,
	password:String,
	name:String,
	number:String,
	fav:[
		{
			type:String,
		}
	]
});
var comment = new mongoose.Schema({
  author:{
	  id:{
		  type:mongoose.Schema.Types.ObjectId,
			ref:"User"
		  
	  },
	  username:String
  },
	comment:String
});
var comment= mongoose.model('comment',comment);
var blog = new mongoose.Schema({
  name: String,
	image:String,
	date:{type:Date, default: Date.now()},
	desc:String,
	comment:[
		{
			type:mongoose.Schema.Types.ObjectId,
			ref:"comment"
		}
	],
	author:{
	  id:{
		  type:mongoose.Schema.Types.ObjectId,
			ref:"User"
		  
	  },
	  username:String
  }
});
var blog = mongoose.model('blog',blog);


User.plugin(passportlocalmongoose);
var User = mongoose.model('User',User);
app.use(require("cookie-session")({
	secret:"i love you sai",
	resave:false,
	saveUninitialized:false
		
		}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localstrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

function isLoggedIn(req,res,next){
	if(req.isAuthenticated()){
		return next();
	}
	res.redirect("/login");
};
function own(req,res,next){
	if(req.isAuthenticated()){
			blog.findById(req.params.id,function(err,blog){
		    if(blog.author.id.equals(req.user._id)){
			   return next();
			   }
			else{
				  res.send("you are not the owner of the blog");
				  }	
	})
	}else{
		res.redirect("/login");
	}
	
};
function ownc(req,res,next){
	if(req.isAuthenticated()){
			comment.findById(req.params.c,function(err,comment){
		    if(comment.author.id.equals(req.user._id)){
			   return next();
			   }
			else{
				  res.send("you are not the owner of the blog");
				  }	
	})
	}else{
		res.redirect("/login");
	}
	
};

app.use(function(req,res,next){
	res.locals.currentUser=req.user;
	next();
});
app.get("/user/add/:id/:fid",function(req,res){
		User.findById(req.params.id,function(err,user){
			user.fav.push(req.params.fid);
			user.save();
			res.send("added");
		});	
});
app.get("/users",function(req,res){
	User.find({},function(err,users){
		res.render("users",{users:users});
	});	
});

app.get("/blogs",function(req,res){
	blog.find({},function(err,blogs){
		res.render("index",{blogs:blogs});
	});	
});

app.get("/",function(req,res){
	res.redirect("/blogs");	
});
app.post("/blogs",function(req,res){
	blog.create(req.body.blog,function(err,blog){
		blog.author.username=req.user.username;
			blog.author.id=req.user._id;
		blog.save();
		res.redirect("/blogs");
	})
});
app.get("/blogs/new",isLoggedIn,function(req,res){
	res.render("new");
});
app.get("/blogs/:id",function(req,res){
	blog.findById(req.params.id).populate('comment').exec(function(err,blog){
		res.render("show",{blog:blog});
	})
});
app.get("/user/:id",function(req,res){
	blog.find().where('author.id').equals(req.params.id).exec(function(err,blogs){
		res.render("index",{blogs:blogs});
	})
});
app.get("/blogs/:id/edit",own,function(req,res){
	blog.findById(req.params.id,function(err,blog){
			   res.render("edit",{ blog : blog });
			 
	})
});
app.post("/updated/:id",own,function(req,res){
	blog.findByIdAndUpdate(req.params.id,req.body.blog,function(err,blog){
		res.redirect("/blogs/"+blog._id);
	})
	
})
app.get("/delete/:id",own,function(req,res){
	blog.findByIdAndRemove(req.params.id,function(err,blog){
		res.redirect("/blogs");
	})
	
});
app.post("/blogs/:id/comments",isLoggedIn,function(req,res){
	comment.create(req.body.comment,function(err,comment){
		blog.findById(req.params.id).populate('comment').exec(function(err,blog){
			comment.author.username=req.user.username;
			comment.author.id=req.user._id;
			comment.save();
			blog.comment.push(comment);
			blog.save();
			res.render("show",{blog:blog});
		});
	})
});
app.get("/register",function(req,res){
	res.render("signup.ejs");
});
app.post("/register",function(req,res){
	nuser = new User({username:req.body.username});
	User.register(nuser,req.body.password,function(err,user){
		if(err){
			return res.render("signup.ejs");
		}
		passport.authenticate("local")(req,res,function(){
			res.redirect("/blogs");
		});
	});
});
app.get("/login",function(req,res){
	res.render("login.ejs");
});
app.post("/login",passport.authenticate('local',
		{
			successRedirect:"/blogs",
			failureRedirect:"/login"
	
		}),function(req,res){
});
app.get("/logout",function(req,res){
	req.logout();
	res.redirect("/blogs");
});

app.post("/comment/:b/:c/:a/edit",ownc,function(req,res){
	
	comment.findById(req.params.c,function(err,comment){
		comment.comment=req.body.comment;
		comment.save();
		})
	res.redirect("/blogs/"+req.params.b);	
});
app.get("/comment/:b/:c/:a/delete",ownc,function(req,res){
	comment.findByIdAndRemove(req.params.c,function(err,blog){
		res.redirect("/blogs/"+req.params.b);
	})
});
app.listen("80",function(){
	console.log("server running");
})


