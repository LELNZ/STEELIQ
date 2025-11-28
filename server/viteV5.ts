import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

/**
 * Express 5 compatible Vite setup
 * Replaces wildcard routes with Express 5 syntax
 */
export async function setupViteCompat(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // Serve built files from dist directory if they exist
  const distPath = path.resolve(import.meta.dirname, "..", "client", "dist");
  const distExists = fs.existsSync(distPath);
  const isReplitEnv = process.env.REPLIT_DOMAINS || process.env.REPL_ID;
  
  if (distExists && isReplitEnv) {
    log(`Serving built files from ${distPath} for preview pane compatibility`);
    
    // Use express.static to properly serve all assets including nested directories
    app.use(express.static(distPath, {
      // Don't redirect directories to trailing slash
      redirect: false,
      // Set proper cache headers
      maxAge: '1h',
      // Allow dotfiles (for .well-known, etc)
      dotfiles: 'allow',
      // Serve index.html for directory requests
      index: 'index.html'
    }));
    
    // SPA fallback: serve index.html for client-side routes (non-file requests)
    app.use((req, res, next) => {
      // Skip API routes
      if (req.originalUrl.startsWith('/api/')) {
        return next();
      }
      
      // Skip if request has file extension (assets)
      if (path.extname(req.originalUrl)) {
        return next();
      }
      
      // Serve index.html for client-side routes
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
      
      next();
    });
  } else if (!distExists) {
    log(`No dist directory found. Run 'npm run build' to enable preview pane support.`);
  }

  // Always use Vite middleware for development (external browser tabs)
  app.use(vite.middlewares);
  
  // Express 5 compatible catch-all route for development mode
  // Use app.all() to handle all HTTP methods and include the root path
  app.all("/", async (req, res, next) => {
    // Skip API routes - they should be handled by Express API handlers
    if (req.originalUrl.startsWith('/api/')) {
      return next();
    }
    
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
  
  // Also add catch-all for other routes in development mode
  app.all("/*splat", async (req, res, next) => {
    // Skip API routes - they should be handled by Express API handlers
    if (req.originalUrl.startsWith('/api/')) {
      return next();
    }
    
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

/**
 * Express 5 compatible static file serving for production
 */
export function serveStaticCompat(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // Express 5 compatible catch-all for single-page app routing
  // Wildcards must be named in Express 5 / path-to-regexp v8
  app.get("/*splat", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

// Re-export with original names for backward compatibility if needed
export const setupVite = setupViteCompat;
export const serveStatic = serveStaticCompat;