#ifndef CENGINE_LEXER_H
#define CENGINE_LEXER_H

#include <stddef.h>

typedef enum {
    TOKEN_EOF,
    TOKEN_INVALID,
    TOKEN_NUMBER,
    TOKEN_STRING,
    TOKEN_IDENTIFIER,
    TOKEN_LET,
    TOKEN_PRINT,
    TOKEN_COLLECT,
    TOKEN_DEF,
    TOKEN_RETURN,
    TOKEN_IF,
    TOKEN_ELSE,
    TOKEN_WHILE,
    TOKEN_TRUE,
    TOKEN_FALSE,
    TOKEN_LPAREN,
    TOKEN_RPAREN,
    TOKEN_LBRACE,
    TOKEN_RBRACE,
    TOKEN_LBRACKET,
    TOKEN_RBRACKET,
    TOKEN_COMMA,
    TOKEN_DOT,
    TOKEN_SEMI,
    TOKEN_EQUAL,
    TOKEN_EQUAL_EQUAL,
    TOKEN_BANG_EQUAL,
    TOKEN_LESS,
    TOKEN_LESS_EQUAL,
    TOKEN_GREATER,
    TOKEN_GREATER_EQUAL,
    TOKEN_PLUS,
    TOKEN_MINUS,
    TOKEN_STAR,
    TOKEN_SLASH,
    TOKEN_BANG,
} TokenType;

typedef struct {
    TokenType type;
    const char *start;
    size_t length;
    long number;
    int line;
} Token;

typedef struct {
    const char *src;
    size_t pos;
    int line;
} Lexer;

void lexer_init(Lexer *lexer, const char *src);
Token lexer_next(Lexer *lexer);

#endif
